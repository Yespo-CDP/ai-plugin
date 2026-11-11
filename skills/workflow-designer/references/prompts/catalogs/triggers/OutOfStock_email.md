<catalog_brief>
name: OutOfStock
full_name: Out of Stock
description: Offer available alternatives when a viewed product is unavailable.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an out of stock trigger. The main purpose is to notify the user that the recently viewed product is out of stock and to offer alternatives that are in stock. The communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for out of stock segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
