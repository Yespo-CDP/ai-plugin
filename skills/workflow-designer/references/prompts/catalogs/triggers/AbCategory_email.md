<catalog_brief>
name: AbCategory
full_name: Abandoned Category
description: Bring users back with top products from categories they visited.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned category trigger. The main goal is to bring the user back to the site by sending a message with top products from categories that the user viewed, but did not view any products. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for abandoned category once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
