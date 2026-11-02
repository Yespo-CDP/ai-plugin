import importlib.util
import json
from pathlib import Path
import shutil
import ssl
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import dns.exception
import dns.message
import dns.name
import dns.resolver
import dns.rrset


SCRIPT = Path(__file__).resolve().parents[1] / "skills/email-deliverability/scripts/audit_technical_setup.py"
SPEC = importlib.util.spec_from_file_location("deliverability_audit", SCRIPT)
audit = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = audit
SPEC.loader.exec_module(audit)
DOMAIN = "example.com"


def resolver(records=(), error=None):
    return Mock(resolve=Mock(return_value=audit.LookupResult(list(records), error)))


class DeliverabilityTests(unittest.TestCase):
    def test_dns_absence_is_distinct_from_lookup_failure(self):
        real = audit.RealDnsResolver()
        for exception, absent in [(dns.resolver.NXDOMAIN(), True), (dns.resolver.NoAnswer(), True),
                                  (dns.exception.Timeout(), False), (dns.resolver.NoNameservers(), False)]:
            with self.subTest(exception=type(exception).__name__), patch.object(real._resolver, "resolve", side_effect=exception):
                result = real.resolve(DOMAIN, "TXT")
                self.assertEqual(result.records, [])
                self.assertEqual(result.error is None, absent)

    def test_network_failures_are_inconclusive_across_checks(self):
        failed = resolver(error="Timeout: test fixture")
        checks = [audit.check_spf(DOMAIN, failed), audit.check_dmarc(DOMAIN, failed),
                  audit.check_dkim(DOMAIN, {"selector": "s"}, failed), audit.check_mx(DOMAIN, failed),
                  audit.check_host_resolution(DOMAIN, failed, purpose="technical-domain"),
                  audit.check_bimi(DOMAIN, failed), audit.check_mta_sts(DOMAIN, failed),
                  audit.check_tls_rpt(DOMAIN, failed)]
        for check in checks:
            with self.subTest(check=check["id"]):
                self.assertEqual(check["status"], "skipped")
                self.assertTrue(check["details"]["inconclusive"])
                self.assertIn("inconclusive", check["message"])

    def test_authoritative_missing_and_valid_records_keep_their_meaning(self):
        self.assertEqual(audit.check_spf(DOMAIN, resolver())["status"], "fail")
        self.assertEqual(audit.check_dmarc(DOMAIN, resolver())["status"], "fail")
        self.assertEqual(audit.check_mx(DOMAIN, resolver())["status"], "warn")
        self.assertEqual(audit.check_spf(DOMAIN, resolver(["v=spf1 -all"]))["status"], "pass")
        self.assertEqual(audit.check_dkim(DOMAIN, {}, resolver())["status"], "skipped")
        mixed = Mock(resolve=Mock(side_effect=lambda name, kind:
                     audit.LookupResult(["192.0.2.1"]) if kind == "A" else audit.LookupResult([], "Timeout")))
        self.assertEqual(audit.check_host_resolution(DOMAIN, mixed, purpose="host")["status"], "pass")

    def test_dmarc_enforcement_percentage(self):
        for suffix, expected in [("", "pass"), ("; pct=100", "pass"), ("; pct=0", "warn"),
                                 ("; pct=25", "warn"), ("; pct=101", "warn"), ("; pct=-1", "warn"),
                                 ("; pct=abc", "warn"), ("; pct=", "warn")]:
            with self.subTest(suffix=suffix):
                result = audit.check_dmarc(DOMAIN, resolver(["v=DMARC1; p=reject" + suffix]))
                self.assertEqual(result["status"], expected)
        zero = audit.check_dmarc(DOMAIN, resolver(["v=DMARC1; p=quarantine; pct=0"]))
        self.assertEqual(zero["details"]["percentage"], 0)
        self.assertIn("0%", zero["message"])
        self.assertEqual(audit.check_dmarc(DOMAIN, resolver(["v=DMARC1; p=none; pct=100"]))["status"], "warn")

    def test_dkim_requires_a_nonempty_key_not_just_a_record(self):
        for records, expected in [([], "fail"), (["unrelated TXT"], "fail"), (["v=DKIM1; p="], "fail"),
                                  (["v=DKIM1; p=   "], "fail"), (["v=DKIM2; p=AQAB"], "fail"),
                                  (["v=DKIM1; p=AQAB"], "pass"), (["p=AQAB"], "pass"),
                                  (["p=AQAB", "p="], "fail")]:
            with self.subTest(records=records):
                self.assertEqual(audit.check_dkim(DOMAIN, {"selector": "s"}, resolver(records))["status"], expected)

    def test_dkim_cname_checks_terminal_txt_using_real_dns_answer(self):
        name = dns.name.from_text("s._domainkey.example.com.")
        for key, expected in [("AQAB", "pass"), ("", "fail"), (None, "fail")]:
            with self.subTest(key=key):
                response = dns.message.make_response(dns.message.make_query(name, "TXT"))
                response.answer.append(dns.rrset.from_text(name, 60, "IN", "CNAME", "target.example.com."))
                if key is not None:
                    response.answer.append(dns.rrset.from_text("target.example.com.", 60, "IN", "TXT", f'"v=DKIM1; p={key}"'))
                response = dns.message.from_wire(response.to_wire())
                answer = dns.resolver.Answer(name, dns.rdatatype.TXT, dns.rdataclass.IN, response)
                real = audit.RealDnsResolver()
                with patch.object(real._resolver, "resolve", return_value=answer):
                    result = audit.check_dkim(DOMAIN, {"selector": "s"}, real)
                self.assertEqual(result["status"], expected)

    def test_mixed_dkim_failure_retains_unresolved_selectors_in_readable_report(self):
        mixed = Mock(resolve=Mock(side_effect=lambda name, kind:
                     audit.LookupResult(["v=DKIM1; p="]) if name.startswith("revoked.")
                     else audit.LookupResult([], "Timeout")))
        report = audit.audit_setup({"orgId": 123, "domains": [{"domain": DOMAIN, "selectors": ["revoked", "unknown"]}]},
                                   resolver=mixed)
        dkim = next(check for check in report["checks"] if check["id"] == "dkim")
        self.assertEqual(dkim["status"], "fail")
        self.assertTrue(dkim["details"]["inconclusive"])
        self.assertIn("unknown._domainkey.example.com", audit.render_markdown(report))

    def test_tls_transport_failure_is_not_a_bad_certificate(self):
        for error, expected in [(TimeoutError("fixture"), "skipped"),
                                (ConnectionRefusedError("fixture"), "skipped"),
                                (ssl.SSLCertVerificationError("fixture"), "fail")]:
            with self.subTest(error=type(error).__name__), patch.object(audit.socket, "create_connection", side_effect=error):
                result = audit.check_short_link_tls(DOMAIN, audit.check_https_tls)
                self.assertEqual(result["status"], expected)
        self.assertEqual(audit.check_short_link_tls(DOMAIN, lambda _: {"status": "pass"})["status"], "pass")

    def test_inconclusive_checks_are_visible_in_report_and_summary(self):
        report = audit.audit_setup({"orgId": 123, "domains": [{"domain": DOMAIN}]},
                                   resolver=resolver(error="Timeout"))
        self.assertEqual(report["summary"]["fail"], 0)
        self.assertEqual(report["summary"]["overallStatus"], "warn")
        markdown = audit.render_markdown(report)
        self.assertIn("Inconclusive Checks", markdown)
        self.assertIn("SPF record could not be verified", markdown)
        self.assertNotIn("No SPF TXT record", markdown)

    def test_absolute_helper_path_runs_outside_plugin_and_writes_only_to_workspace(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            installed = root / "installed plugin"
            workspace = root / "task workspace"
            installed.mkdir()
            workspace.mkdir()
            helper = installed / SCRIPT.name
            shutil.copy2(SCRIPT, helper)
            (workspace / "setup.json").write_text(json.dumps({"orgId": 123, "domains": []}))
            result = subprocess.run([sys.executable, str(helper), "--input", "setup.json", "--output-dir", "output"],
                                    cwd=workspace, capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            reports = list((workspace / "output").glob("*.json"))
            self.assertEqual(len(reports), 1)
            self.assertEqual(json.loads(reports[0].read_text())["orgId"], 123)
            self.assertEqual(list(installed.iterdir()), [helper])


if __name__ == "__main__":
    unittest.main()
