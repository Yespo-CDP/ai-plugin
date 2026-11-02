#!/usr/bin/env python3
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import socket
import ssl
import sys
from typing import Any, Protocol


CHECK_PASS = "pass"
CHECK_WARN = "warn"
CHECK_FAIL = "fail"
CHECK_INFO = "info"
CHECK_SKIPPED = "skipped"

EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b")
SPF_LOOKUP_RE = re.compile(r"(?i)(?:^|\s)(include|a|mx|ptr|exists)(?::[^\s]+)?")
SPF_REDIRECT_RE = re.compile(r"(?i)(?:^|\s)redirect=")
DOMAINKEY_RE = re.compile(r"(?i)(?:^|\.)([^.\s]+)\._domainkey\.([a-z0-9.-]+)$")


@dataclass(frozen=True)
class LookupResult:
    records: list[str]
    error: str | None = None


class DnsResolver(Protocol):
    def resolve(self, name: str, record_type: str) -> LookupResult:
        ...


class RealDnsResolver:
    def __init__(self, *, timeout: float = 4.0) -> None:
        try:
            import dns.resolver
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "dnspython is required for DNS checks. Install project dependencies before running this audit."
            ) from exc

        self._dns_resolver_module = dns.resolver
        self._resolver = dns.resolver.Resolver()
        self._resolver.timeout = timeout
        self._resolver.lifetime = timeout

    def resolve(self, name: str, record_type: str) -> LookupResult:
        normalized_name = _normalize_domain(name)
        normalized_type = record_type.upper()
        try:
            answers = self._resolver.resolve(normalized_name, normalized_type)
        except (self._dns_resolver_module.NXDOMAIN, self._dns_resolver_module.NoAnswer):
            return LookupResult(records=[])
        except Exception as exc:  # dnspython exception types vary by lookup path.
            return LookupResult(records=[], error=f"{type(exc).__name__}: {exc}")

        records: list[str] = []
        for answer in answers:
            if normalized_type == "TXT":
                strings = getattr(answer, "strings", None)
                if strings:
                    records.append(b"".join(strings).decode("utf-8", errors="replace"))
                else:
                    records.append(str(answer).strip('"'))
            elif normalized_type == "MX":
                preference = getattr(answer, "preference", "")
                exchange = str(getattr(answer, "exchange", answer)).rstrip(".")
                records.append(f"{preference} {exchange}".strip())
            else:
                records.append(str(answer).rstrip("."))
        return LookupResult(records=records)


class HttpsTlsChecker(Protocol):
    def __call__(self, hostname: str) -> dict[str, Any]:
        ...


def check_https_tls(hostname: str, *, timeout: float = 5.0) -> dict[str, Any]:
    normalized = _normalize_domain(hostname)
    try:
        context = ssl.create_default_context()
        with socket.create_connection((normalized, 443), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=normalized) as wrapped:
                cert = wrapped.getpeercert()
    except ssl.SSLCertVerificationError as exc:
        return {
            "status": CHECK_FAIL,
            "error": f"{type(exc).__name__}: {exc}",
        }
    except Exception as exc:
        return {"status": CHECK_SKIPPED, "error": f"{type(exc).__name__}: {exc}"}

    not_after = cert.get("notAfter") if isinstance(cert, dict) else None
    return {
        "status": CHECK_PASS,
        "notAfter": not_after,
        "subject": cert.get("subject") if isinstance(cert, dict) else None,
        "issuer": cert.get("issuer") if isinstance(cert, dict) else None,
    }


def audit_setup(
    payload: dict[str, Any],
    *,
    resolver: DnsResolver | None = None,
    tls_checker: HttpsTlsChecker | None = None,
    generated_at: str | None = None,
) -> dict[str, Any]:
    resolver = resolver or RealDnsResolver()
    tls_checker = tls_checker or check_https_tls
    generated_at = generated_at or _utc_now_iso()

    org_id = payload.get("orgId")
    domains_payload = _as_list(payload.get("domains"))
    sender_payload = _as_dict(payload.get("sender"))
    short_links_payload = _as_dict(payload.get("shortLinks"))

    root_domains = _ordered_unique(
        _normalize_domain(item.get("domain"))
        for item in domains_payload
        if isinstance(item, dict) and item.get("domain")
    )
    technical_domains = _ordered_unique(
        domain
        for item in domains_payload
        if isinstance(item, dict)
        for domain in _extract_technical_domains(item)
    )
    sender_emails = _extract_sender_emails(sender_payload.get("publicInterface"))
    sender_domains = _ordered_unique(domain for _, domain in sender_emails)
    short_link_domains = _ordered_unique(
        _normalize_domain(item.get("domain"))
        for item in _as_list(short_links_payload.get("sslDomains"))
        if isinstance(item, dict) and item.get("domain")
    )

    checks: list[dict[str, Any]] = []
    domain_reports: list[dict[str, Any]] = []
    for item in domains_payload:
        if not isinstance(item, dict):
            continue
        domain = _normalize_domain(item.get("domain"))
        if not domain:
            continue
        item_report_checks = [
            _check_domain_configuration(item),
            _check_domain_errors(item),
            _check_verification_history(item),
            _check_warmup_info(item),
            check_spf(domain, resolver),
            check_dmarc(domain, resolver),
            check_dkim(domain, item, resolver),
            check_bimi(domain, resolver),
            check_mta_sts(domain, resolver),
            check_tls_rpt(domain, resolver),
        ]
        item_technical_domains = _extract_technical_domains(item)
        item_report_checks.extend(check_host_resolution(host, resolver, purpose="technical-domain") for host in item_technical_domains)
        checks.extend(item_report_checks)
        domain_reports.append(
            {
                "id": item.get("id"),
                "domain": domain,
                "technicalDomains": item_technical_domains,
                "checks": item_report_checks,
            }
        )

    sender_checks = check_sender_setup(sender_payload, root_domains)
    sender_checks.extend(check_mx(domain, resolver) for domain in sender_domains)
    checks.extend(sender_checks)

    short_link_checks = check_short_links(short_links_payload)
    for domain in short_link_domains:
        short_link_checks.append(check_host_resolution(domain, resolver, purpose="short-link-domain"))
        short_link_checks.append(check_short_link_tls(domain, tls_checker))
    checks.extend(short_link_checks)

    summary = _summarize_checks(checks)
    return {
        "orgId": org_id,
        "generatedAt": generated_at,
        "sourceGeneratedAt": payload.get("generatedAt"),
        "summary": summary,
        "domains": domain_reports,
        "sender": {
            "emails": [{"email": email, "domain": domain} for email, domain in sender_emails],
            "domains": sender_domains,
            "checks": sender_checks,
        },
        "shortLinks": {
            "domains": short_link_domains,
            "checks": short_link_checks,
        },
        "oneClickUnsubscribe": {
            "enabled": _as_dict(payload.get("oneClickUnsubscribe")).get("enabled"),
        },
        "checks": checks,
    }


def check_spf(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    lookup = _lookup(resolver, domain, "TXT")
    spf_records = [record for record in lookup.records if record.lower().startswith("v=spf1")]
    details: dict[str, Any] = {"records": spf_records}
    if lookup.error:
        details["dnsError"] = lookup.error
        return _inconclusive_check("spf", "SPF record", domain, details)
    if not spf_records:
        return _check(
            "spf",
            "SPF record",
            CHECK_FAIL,
            domain,
            "No SPF TXT record was found.",
            details=details,
        )
    if len(spf_records) > 1:
        return _check(
            "spf",
            "SPF record",
            CHECK_FAIL,
            domain,
            "Multiple SPF TXT records were found.",
            details=details,
            recommendation="Publish exactly one SPF record per domain.",
        )

    record = spf_records[0]
    estimated_lookups = len(SPF_LOOKUP_RE.findall(record)) + len(SPF_REDIRECT_RE.findall(record))
    details["estimatedDnsLookups"] = estimated_lookups
    if estimated_lookups > 10:
        return _check(
            "spf.lookup_budget",
            "SPF DNS lookup budget",
            CHECK_FAIL,
            domain,
            "SPF appears to exceed the 10 DNS lookup limit.",
            details=details,
            recommendation="Flatten or simplify SPF includes so receivers do not hit permerror.",
        )
    if "-all" not in record and "~all" not in record and "?all" not in record and "redirect=" not in record.lower():
        return _check(
            "spf.termination",
            "SPF termination",
            CHECK_WARN,
            domain,
            "SPF does not contain an all mechanism or redirect modifier.",
            details=details,
        )
    return _check("spf", "SPF record", CHECK_PASS, domain, "SPF record exists and basic checks passed.", details=details)


def check_dmarc(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    name = f"_dmarc.{domain}"
    lookup = _lookup(resolver, name, "TXT")
    records = [record for record in lookup.records if record.lower().startswith("v=dmarc1")]
    details: dict[str, Any] = {"name": name, "records": records}
    if lookup.error:
        details["dnsError"] = lookup.error
        return _inconclusive_check("dmarc", "DMARC record", domain, details)
    if not records:
        return _check("dmarc", "DMARC record", CHECK_FAIL, domain, "No DMARC TXT record was found.", details=details)
    if len(records) > 1:
        return _check("dmarc", "DMARC record", CHECK_FAIL, domain, "Multiple DMARC TXT records were found.", details=details)

    tags = _parse_tag_record(records[0])
    policy = tags.get("p", "").lower()
    details["tags"] = tags
    if policy not in {"none", "quarantine", "reject"}:
        return _check("dmarc.policy", "DMARC policy", CHECK_FAIL, domain, "DMARC policy is missing or invalid.", details=details)
    percentage = tags.get("pct", "100")
    if not re.fullmatch(r"[0-9]{1,3}", percentage) or int(percentage) > 100:
        return _check("dmarc.policy", "DMARC policy", CHECK_WARN, domain, "DMARC enforcement percentage is invalid.", details=details)
    details["percentage"] = int(percentage)
    if policy == "none":
        return _check(
            "dmarc.policy",
            "DMARC policy",
            CHECK_WARN,
            domain,
            "DMARC is set to monitoring-only policy p=none.",
            details=details,
            recommendation="Move toward quarantine or reject after validating alignment and reports.",
        )
    if int(percentage) < 100:
        return _check("dmarc.policy", "DMARC policy", CHECK_WARN, domain,
                      f"DMARC requests p={policy} for only {percentage}% of messages.", details=details)
    return _check("dmarc", "DMARC record", CHECK_PASS, domain, f"DMARC policy is p={policy}.", details=details)


def check_dkim(domain: str, domain_payload: dict[str, Any], resolver: DnsResolver) -> dict[str, Any]:
    record_names = _extract_dkim_record_names(domain, domain_payload)
    if not record_names:
        return _check(
            "dkim",
            "DKIM record",
            CHECK_SKIPPED,
            domain,
            "MCP configuration did not expose DKIM selector or record names.",
        )

    details: dict[str, Any] = {"recordNames": record_names, "lookups": {}}
    invalid: list[str] = []
    inconclusive: list[str] = []
    for name in record_names:
        # Resolver.resolve(TXT) follows CNAMEs and returns the terminal TXT RRset.
        # An alias alone is not evidence of a published DKIM key.
        txt_lookup = _lookup(resolver, name, "TXT")
        details["lookups"][name] = {
            "txt": txt_lookup.records,
            "txtError": txt_lookup.error,
        }
        if txt_lookup.error:
            inconclusive.append(name)
            continue
        tags = _parse_tag_record(txt_lookup.records[0]) if len(txt_lookup.records) == 1 else {}
        if tags.get("v", "DKIM1") != "DKIM1" or not tags.get("p", "").strip():
            invalid.append(name)
    if inconclusive:
        details.update(inconclusive=True, unresolvedRecordNames=inconclusive)
    if invalid:
        details["invalidOrMissing"] = invalid
        unresolved = f" Unresolved selectors: {', '.join(inconclusive)}." if inconclusive else ""
        return _check("dkim", "DKIM record", CHECK_FAIL, domain,
                      "One or more DKIM records are missing, malformed, or have an empty (revoked) public key." + unresolved, details=details)
    if inconclusive:
        return _inconclusive_check("dkim", "DKIM record", domain, details)
    return _check("dkim", "DKIM record", CHECK_PASS, domain, "DKIM selector records contain nonempty public keys.", details=details)


def check_mx(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    lookup = _lookup(resolver, domain, "MX")
    details: dict[str, Any] = {"records": lookup.records}
    if lookup.error:
        details["dnsError"] = lookup.error
        return _inconclusive_check("mx", "MX records", domain, details)
    if not lookup.records:
        return _check("mx", "MX records", CHECK_WARN, domain, "No MX records were found for this sender/reply domain.", details=details)
    return _check("mx", "MX records", CHECK_PASS, domain, "MX records were found.", details=details)


def check_host_resolution(hostname: str, resolver: DnsResolver, *, purpose: str) -> dict[str, Any]:
    cname_lookup = _lookup(resolver, hostname, "CNAME")
    a_lookup = _lookup(resolver, hostname, "A")
    aaaa_lookup = _lookup(resolver, hostname, "AAAA")
    details = {
        "cname": cname_lookup.records,
        "a": a_lookup.records,
        "aaaa": aaaa_lookup.records,
        "errors": {
            "cname": cname_lookup.error,
            "a": a_lookup.error,
            "aaaa": aaaa_lookup.error,
        },
    }
    if a_lookup.records or aaaa_lookup.records:
        return _check(purpose, "Host resolution", CHECK_PASS, hostname, "Host resolves publicly.", details=details)
    if any(details["errors"].values()):
        return _inconclusive_check(purpose, "Host resolution", hostname, details)
    if cname_lookup.records:
        return _check(purpose, "Host resolution", CHECK_PASS, hostname, "Host has a public CNAME record.", details=details)
    return _check(purpose, "Host resolution", CHECK_FAIL, hostname, "Host does not resolve publicly.", details=details)


def check_short_link_tls(hostname: str, tls_checker: HttpsTlsChecker) -> dict[str, Any]:
    result = tls_checker(hostname)
    status = result.get("status") if isinstance(result, dict) else None
    if status == CHECK_PASS:
        return _check("short_link.tls", "Short-link HTTPS/TLS", CHECK_PASS, hostname, "HTTPS certificate is valid.", details=result)
    if status == CHECK_FAIL:
        return _check("short_link.tls", "Short-link HTTPS/TLS", CHECK_FAIL, hostname, "HTTPS/TLS certificate validation failed.", details=result)
    return _inconclusive_check("short_link.tls", "Short-link HTTPS/TLS", hostname, _as_dict(result))


def check_bimi(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    return _optional_txt_check("bimi", "BIMI record", f"default._bimi.{domain}", resolver)


def check_mta_sts(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    return _optional_txt_check("mta_sts", "MTA-STS record", f"_mta-sts.{domain}", resolver)


def check_tls_rpt(domain: str, resolver: DnsResolver) -> dict[str, Any]:
    return _optional_txt_check("tls_rpt", "TLS-RPT record", f"_smtp._tls.{domain}", resolver)


def check_sender_setup(sender_payload: dict[str, Any], verified_domains: list[str]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    mailing_config = _as_dict(sender_payload.get("mailingConfiguration"))
    sending_domains = _as_list(sender_payload.get("sendingDomains"))
    public_interface = sender_payload.get("publicInterface")

    if mailing_config.get("mailingsBanned") is True:
        checks.append(_check("sender.mailings_banned", "Mailings status", CHECK_FAIL, "sender", "Mailings are banned."))
    elif mailing_config:
        checks.append(_check("sender.mailings_banned", "Mailings status", CHECK_PASS, "sender", "Mailings are not banned."))
    else:
        checks.append(_check("sender.mailings_banned", "Mailings status", CHECK_SKIPPED, "sender", "Mailing configuration is absent."))

    configured = _as_list(mailing_config.get("configuredSenderDomains"))
    inactive = [
        item.get("domain")
        for item in configured
        if isinstance(item, dict) and item.get("active") is False
    ]
    failed = [
        item.get("domain")
        for item in configured
        if isinstance(item, dict) and item.get("verificationPassed") is False
    ]
    if inactive or failed:
        checks.append(
            _check(
                "sender.configured_domains",
                "Configured sender domains",
                CHECK_WARN,
                "sender",
                "Some configured sender domains are inactive or not verified.",
                details={"inactive": inactive, "failed": failed},
            )
        )
    elif configured:
        checks.append(
            _check(
                "sender.configured_domains",
                "Configured sender domains",
                CHECK_PASS,
                "sender",
                "Configured sender domains are active and verified.",
            )
        )
    else:
        checks.append(
            _check("sender.configured_domains", "Configured sender domains", CHECK_SKIPPED, "sender", "No configured sender domain list was provided.")
        )

    interfaces = _as_list(public_interface) if not isinstance(public_interface, dict) else [public_interface]
    unavailable = [
        {"email": item.get("email"), "status": item.get("status"), "statusReason": item.get("statusReason")}
        for item in interfaces
        if isinstance(item, dict) and item.get("status") not in {None, "AVAILABLE"}
    ]
    if unavailable:
        checks.append(
            _check(
                "sender.public_interface",
                "Sender interfaces",
                CHECK_FAIL,
                "sender",
                "One or more sender interfaces are unavailable.",
                details={"unavailable": unavailable},
            )
        )
    elif interfaces:
        checks.append(_check("sender.public_interface", "Sender interfaces", CHECK_PASS, "sender", "Sender interfaces are available."))
    else:
        checks.append(_check("sender.public_interface", "Sender interfaces", CHECK_SKIPPED, "sender", "No sender interfaces were provided."))

    sender_domains = _ordered_unique(domain for _, domain in _extract_sender_emails(public_interface))
    allowed_domains = set(verified_domains)
    allowed_domains.update(
        _normalize_domain(item.get("domain"))
        for item in configured
        if isinstance(item, dict) and item.get("domain")
    )
    allowed_domains.update(
        _normalize_domain(item.get("domain"))
        for item in sending_domains
        if isinstance(item, dict) and item.get("domain")
    )
    unaligned = [domain for domain in sender_domains if domain not in allowed_domains]
    if unaligned:
        checks.append(
            _check(
                "sender.domain_alignment",
                "Sender domain alignment",
                CHECK_FAIL,
                "sender",
                "Some sender emails use domains that are not verified/sending domains.",
                details={"senderDomains": sender_domains, "verifiedDomains": sorted(allowed_domains), "unaligned": unaligned},
            )
        )
    elif sender_domains:
        checks.append(_check("sender.domain_alignment", "Sender domain alignment", CHECK_PASS, "sender", "Sender email domains align with configured domains."))
    else:
        checks.append(_check("sender.domain_alignment", "Sender domain alignment", CHECK_SKIPPED, "sender", "No sender emails were provided."))

    return checks


def check_short_links(short_links_payload: dict[str, Any]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    ssl_domains = _as_list(short_links_payload.get("sslDomains"))
    not_issued = [
        {"domain": item.get("domain"), "status": item.get("status"), "active": item.get("active")}
        for item in ssl_domains
        if isinstance(item, dict) and (item.get("status") != "ISSUED" or item.get("active") is not True)
    ]
    if not_issued:
        checks.append(
            _check(
                "short_link.ssl_status",
                "Short-link SSL domains",
                CHECK_WARN,
                "short-links",
                "Some short-link SSL domains are inactive or not issued.",
                details={"notIssuedOrInactive": not_issued},
            )
        )
    elif ssl_domains:
        checks.append(_check("short_link.ssl_status", "Short-link SSL domains", CHECK_PASS, "short-links", "Short-link SSL domains are issued and active."))
    else:
        checks.append(_check("short_link.ssl_status", "Short-link SSL domains", CHECK_SKIPPED, "short-links", "No custom short-link SSL domains were provided."))

    settings = _as_dict(short_links_payload.get("settings"))
    if settings.get("enabled") is False:
        checks.append(_check("short_link.settings", "Short-link settings", CHECK_WARN, "short-links", "Link tagging/short-link settings appear disabled."))
    elif settings:
        checks.append(_check("short_link.settings", "Short-link settings", CHECK_INFO, "short-links", "Short-link settings were returned by MCP."))
    else:
        checks.append(_check("short_link.settings", "Short-link settings", CHECK_SKIPPED, "short-links", "Short-link settings were not provided."))
    return checks


def render_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Email Deliverability Technical Setup Audit",
        "",
        f"- Organization: `{report.get('orgId')}`",
        f"- Generated: `{report.get('generatedAt')}`",
        f"- Overall: **{summary['overallStatus']}**",
        f"- Checks: {summary['pass']} pass, {summary['warn']} warn, {summary['fail']} fail, {summary['skipped']} skipped",
        "",
    ]
    issues = [
        check
        for check in report["checks"]
        if check["status"] in {CHECK_FAIL, CHECK_WARN}
    ]
    if issues:
        lines.extend(["## Priority Findings", ""])
        for check in issues[:12]:
            lines.append(f"- **{check['status'].upper()}** `{check['subject']}` {check['title']}: {check['message']}")
        lines.append("")
    else:
        lines.extend(["## Priority Findings", "", "- No failing or warning checks found.", ""])

    inconclusive = [check for check in report["checks"] if check.get("details", {}).get("inconclusive")]
    if inconclusive:
        lines.extend(["## Inconclusive Checks", ""])
        lines.extend(f"- `{check['subject']}` {check['message']}" for check in inconclusive)
        lines.append("")

    lines.extend(["## Domains", ""])
    for domain in report["domains"]:
        statuses = _summarize_checks(domain["checks"])
        lines.append(
            f"- `{domain['domain']}`: {statuses['pass']} pass, {statuses['warn']} warn, {statuses['fail']} fail, {statuses['skipped']} skipped"
        )
    if not report["domains"]:
        lines.append("- No domains were returned by MCP.")
    lines.append("")

    lines.extend(["## Sender And Links", ""])
    lines.append(f"- Sender domains: {', '.join(f'`{domain}`' for domain in report['sender']['domains']) or 'none'}")
    lines.append(f"- Short-link domains: {', '.join(f'`{domain}`' for domain in report['shortLinks']['domains']) or 'none'}")
    lines.append("")
    return "\n".join(lines)


def write_artifacts(report: dict[str, Any], *, output_dir: Path) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    org_id = re.sub(r"[^0-9A-Za-z_-]+", "", str(report.get("orgId") or "")) or "unknown"
    timestamp = _filename_timestamp(report["generatedAt"])
    json_path = output_dir / f"technical_setup_{org_id}_{timestamp}.json"
    md_path = output_dir / f"technical_setup_{org_id}_{timestamp}.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    return json_path, md_path


def _check_domain_configuration(domain_payload: dict[str, Any]) -> dict[str, Any]:
    domain = _normalize_domain(domain_payload.get("domain"))
    configuration = _as_dict(domain_payload.get("configuration"))
    if not configuration:
        return _check("mcp.domain_configuration", "Domain configuration", CHECK_SKIPPED, domain, "No domain configuration was provided by MCP.")
    status = _find_first_key(configuration, {"status"})
    verification_passed = _find_first_key(configuration, {"verificationPassed", "verified"})
    details = {"status": status, "verificationPassed": verification_passed, "configuration": configuration}
    if status in {"CONFIGURED", "VERIFIED"} or verification_passed is True:
        return _check("mcp.domain_configuration", "Domain configuration", CHECK_PASS, domain, "Yespo domain configuration is verified/configured.", details=details)
    return _check("mcp.domain_configuration", "Domain configuration", CHECK_WARN, domain, "Yespo domain configuration is not clearly verified.", details=details)


def _check_domain_errors(domain_payload: dict[str, Any]) -> dict[str, Any]:
    domain = _normalize_domain(domain_payload.get("domain"))
    errors = _as_list(domain_payload.get("errors"))
    if errors:
        return _check("mcp.domain_errors", "Domain MCP errors", CHECK_FAIL, domain, "MCP returned errors for this domain.", details={"errors": errors})
    return _check("mcp.domain_errors", "Domain MCP errors", CHECK_PASS, domain, "MCP returned no domain errors.")


def _check_verification_history(domain_payload: dict[str, Any]) -> dict[str, Any]:
    domain = _normalize_domain(domain_payload.get("domain"))
    history = _extract_history_items(domain_payload.get("verificationHistory"))
    if not history:
        return _check("mcp.verification_history", "Verification history", CHECK_SKIPPED, domain, "No verification history was provided.")
    latest = history[0]
    latest_verified = latest.get("verified")
    recent_values = [item.get("verified") for item in history[:8] if isinstance(item, dict)]
    details = {"latest": latest, "recentVerifiedValues": recent_values}
    if latest_verified is False:
        return _check("mcp.verification_history", "Verification history", CHECK_FAIL, domain, "Latest verification history entry is failed.", details=details)
    if True in recent_values and False in recent_values:
        return _check("mcp.verification_history", "Verification history", CHECK_WARN, domain, "Recent verification history contains both pass and fail states.", details=details)
    return _check("mcp.verification_history", "Verification history", CHECK_PASS, domain, "Recent verification history is stable.", details=details)


def _check_warmup_info(domain_payload: dict[str, Any]) -> dict[str, Any]:
    domain = _normalize_domain(domain_payload.get("domain"))
    warmup = domain_payload.get("warmupInfo")
    if warmup is None or warmup == "":
        return _check("mcp.warmup_info", "Warmup info", CHECK_SKIPPED, domain, "No warmup info was provided.")
    if isinstance(warmup, list) and not warmup:
        return _check("mcp.warmup_info", "Warmup info", CHECK_INFO, domain, "Warmup info is empty.", details={"warmupInfo": warmup})
    return _check("mcp.warmup_info", "Warmup info", CHECK_INFO, domain, "Warmup info was returned by MCP.", details={"warmupInfo": warmup})


def _optional_txt_check(check_id: str, title: str, name: str, resolver: DnsResolver) -> dict[str, Any]:
    lookup = _lookup(resolver, name, "TXT")
    details: dict[str, Any] = {"name": name, "records": lookup.records}
    if lookup.error:
        details["dnsError"] = lookup.error
        return _inconclusive_check(check_id, title, name, details)
    domain = name.split(".", 1)[1] if "." in name else name
    if lookup.records:
        return _check(check_id, title, CHECK_INFO, domain, f"{title} was found.", details=details)
    return _check(check_id, title, CHECK_SKIPPED, domain, f"{title} was not found.", details=details)


def _extract_technical_domains(domain_payload: dict[str, Any]) -> list[str]:
    values: list[str] = []
    for source in (domain_payload, _as_dict(domain_payload.get("configuration"))):
        for key in ("subDomain", "technicalDomain", "subdomain", "technical_domain"):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                values.append(_normalize_domain(value))
    return _ordered_unique(values)


def _extract_dkim_record_names(domain: str, payload: Any) -> list[str]:
    names: list[str] = []
    selectors: list[str] = []

    def walk(value: Any, parent_key: str = "") -> None:
        if isinstance(value, dict):
            type_value = str(value.get("type") or value.get("recordType") or "").upper()
            record_name = value.get("name") or value.get("host") or value.get("recordName")
            if isinstance(record_name, str) and "_domainkey" in record_name.lower():
                names.append(_normalize_record_name(record_name, domain))
            for key, child in value.items():
                lowered = key.lower()
                if lowered in {"selector", "dkimselector"} and isinstance(child, str):
                    selectors.append(child)
                elif lowered in {"selectors", "dkimselectors"} and isinstance(child, list):
                    selectors.extend(str(item) for item in child if isinstance(item, str))
                elif "dkim" in lowered and isinstance(child, str):
                    if "_domainkey" in child.lower():
                        names.append(_normalize_record_name(child, domain))
                    elif re.fullmatch(r"[a-zA-Z0-9_-]+", child):
                        selectors.append(child)
                elif type_value in {"TXT", "CNAME"} and isinstance(child, str) and "_domainkey" in child.lower():
                    names.append(_normalize_record_name(child, domain))
                walk(child, lowered)
        elif isinstance(value, list):
            for item in value:
                walk(item, parent_key)
        elif isinstance(value, str) and "_domainkey" in value.lower():
            names.append(_normalize_record_name(value, domain))

    walk(payload)
    for selector in selectors:
        normalized = selector.strip().strip(".")
        if not normalized:
            continue
        if "_domainkey" in normalized.lower():
            names.append(_normalize_record_name(normalized, domain))
        else:
            names.append(f"{normalized}._domainkey.{domain}")
    return _ordered_unique(names)


def _extract_sender_emails(public_interface: Any) -> list[tuple[str, str]]:
    emails: list[tuple[str, str]] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key in ("email", "responseEmail", "replyToEmail", "fromEmail"):
                raw = value.get(key)
                if isinstance(raw, str):
                    for match in EMAIL_RE.finditer(raw):
                        email = match.group(0).lower()
                        emails.append((email, _normalize_domain(match.group(1))))
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(public_interface)
    return _ordered_unique_tuple(emails)


def _extract_history_items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        items = value.get("items")
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def _find_first_key(value: Any, keys: set[str]) -> Any:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in keys:
                if not isinstance(child, (dict, list)):
                    return child
            found = _find_first_key(child, keys)
            if found is not None:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_first_key(child, keys)
            if found is not None:
                return found
    return None


def _lookup(resolver: DnsResolver, name: str, record_type: str) -> LookupResult:
    result = resolver.resolve(name, record_type)
    if isinstance(result, LookupResult):
        return result
    if isinstance(result, list):
        return LookupResult(records=[str(item) for item in result])
    return LookupResult(records=[], error=f"Unexpected resolver result: {result!r}")


def _parse_tag_record(record: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for part in record.split(";"):
        key, sep, value = part.strip().partition("=")
        if sep:
            tags[key.strip().lower()] = value.strip()
    return tags


def _check(
    check_id: str,
    title: str,
    status: str,
    subject: str,
    message: str,
    *,
    details: dict[str, Any] | None = None,
    recommendation: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": check_id,
        "title": title,
        "status": status,
        "subject": subject,
        "message": message,
    }
    if recommendation:
        payload["recommendation"] = recommendation
    if details:
        payload["details"] = details
    return payload


def _inconclusive_check(check_id: str, title: str, subject: str, details: dict[str, Any]) -> dict[str, Any]:
    return _check(check_id, title, CHECK_SKIPPED, subject,
                  f"{title} could not be verified because the network check was inconclusive.",
                  details={**details, "inconclusive": True})


def _summarize_checks(checks: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {
        CHECK_PASS: 0,
        CHECK_WARN: 0,
        CHECK_FAIL: 0,
        CHECK_INFO: 0,
        CHECK_SKIPPED: 0,
    }
    for check in checks:
        status = check.get("status")
        if status in counts:
            counts[status] += 1
    if counts[CHECK_FAIL]:
        overall = "fail"
    elif counts[CHECK_WARN] or any(check.get("details", {}).get("inconclusive") for check in checks):
        overall = "warn"
    else:
        overall = "pass"
    return {
        "overallStatus": overall,
        "pass": counts[CHECK_PASS],
        "warn": counts[CHECK_WARN],
        "fail": counts[CHECK_FAIL],
        "info": counts[CHECK_INFO],
        "skipped": counts[CHECK_SKIPPED],
        "total": sum(counts.values()),
    }


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def _normalize_domain(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip().strip(".").lower()


def _normalize_record_name(value: str, domain: str) -> str:
    normalized = _normalize_domain(value)
    if normalized.endswith(domain):
        return normalized
    if DOMAINKEY_RE.search(normalized):
        return normalized
    return f"{normalized}.{domain}"


def _ordered_unique(values: Any) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = _normalize_domain(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _ordered_unique_tuple(values: list[tuple[str, str]]) -> list[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()
    result: list[tuple[str, str]] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _filename_timestamp(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z]+", "", value.replace("Z", "Z")) or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a Yespo email deliverability technical setup audit.")
    parser.add_argument("--input", required=True, type=Path, help="Path to get_email_deliverability_setup JSON.")
    parser.add_argument("--output-dir", type=Path, default=Path("output/email-deliverability"))
    parser.add_argument("--generated-at", help="Override generatedAt in the produced audit report.")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("input JSON root must be an object")
        report = audit_setup(payload, generated_at=args.generated_at)
        json_path, md_path = write_artifacts(report, output_dir=args.output_dir)
    except Exception as exc:
        print(f"email deliverability audit failed: {exc}", file=sys.stderr)
        return 1

    print(render_markdown(report))
    print(f"JSON artifact: {json_path}")
    print(f"Markdown artifact: {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
