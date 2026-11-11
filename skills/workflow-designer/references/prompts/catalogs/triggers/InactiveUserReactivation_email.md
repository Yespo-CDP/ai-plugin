<catalog_brief>
name: InactiveUserReactivation
full_name: Inactive Users Reactivation
description: Re-engage users who haven't interacted with your site for a while.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for reactivating inactive users. The main goal is to remind yourself and attract the attention of those who have not visited the site for more than 30 days. Communication is carried out by sending 1 reminder email with the products that the user has viewed and recommendations for previously viewed products.
</brief>

<start_trigger>
It should start for inactive users segment once a day (any day of week) starting from tomorrow at 15:00 starting from tomorrow, but no more than once a 90 days for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
