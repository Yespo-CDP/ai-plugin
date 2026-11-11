<catalog_brief>
name: RegularDemand
full_name: Repeat Purchase
description: Encourage replenishment of products with regular demand.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a regular demand trigger. The main goal is to stimulate repeat sales of products that are ending and need to be restocked. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for repeat purchase segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
