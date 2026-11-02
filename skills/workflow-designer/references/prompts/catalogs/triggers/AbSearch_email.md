<catalog_brief>
name: AbSearch
full_name: Abandoned Search
description: Offer relevant products when a user's search returns no results.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is an abandoned search trigger. The main goal is to attract attention and offer a selection of bestsellers or personal recommendations in a situation where the user was looking for a product, but the search did not return any results. Communication is carried out by sending 1 reminder email.
</brief>

<start_trigger>
It should start for abandoned search once an hour starting from tomorrow, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
