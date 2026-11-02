<catalog_brief>
name: ReducedPriceSimilarView
full_name: Discount on Similar Viewed Products
description: Highlight discounted products similar to recently viewed products
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a price reduction trigger for similar products to those viewed. The main goal is to draw attention to products that have been discounted and are similar to those that were recently viewed but not purchased. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for discount similar viewed segment once a day (any day of week) starting from tomorrow at 11:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
