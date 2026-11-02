<catalog_brief>
name: ReducedPriceView
full_name: Discount on Viewed Products
description: Notify users when products they viewed become cheaper.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a trigger for a price reduction on reviewed products. The main goal is to draw attention to the fact that reviewed products have become cheaper and thereby motivate them to place an order. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discount viewed segment once a day (any day of week) starting from tomorrow at 10:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
