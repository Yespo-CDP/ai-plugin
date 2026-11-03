<catalog_brief>
name: AbCart
full_name: Abandoned Cart
description: Recover carts when users add items but do not complete the purchase.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned cart trigger whose main goal is to recover abandoned carts by sending up to 3 reminder emails at 24 hours intervals.
</brief>

<start_trigger>
It should start for abandoned cart segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Start by sending an email
Wait 24 hours
Send 2nd email
Wait 24 hours
Send 3rd email
End script
</generation_plan>
</trigger_instruction>
