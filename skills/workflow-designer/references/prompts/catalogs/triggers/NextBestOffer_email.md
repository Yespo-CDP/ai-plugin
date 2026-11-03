<catalog_brief>
name: NextBestOffer
full_name: Next Best Offer
description: Recommend complementary or frequently bought together products.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a next best offer trigger. The main goal is to recommend additional products that can complement the purchased ones or that are often purchased together with the ones purchased. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for next best offer segment once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
