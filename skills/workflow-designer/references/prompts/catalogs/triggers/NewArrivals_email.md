<catalog_brief>
name: NewArrivals
full_name: New Arrivals
description: Show new products from categories the user previously explored.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a new product trigger. The main goal is to attract the attention of a user who has previously viewed products but has not made a purchase. A message is sent with new products that have appeared in the categories that the user has viewed. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for new arrivals segment once a day (any day of week) starting from tomorrow at 12:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
