<catalog_brief>
name: ReminderWishlist
full_name: Wishlist Reminder
description: Remind users about products they added to their wishlist.
variant: email
</catalog_brief>

<trigger_instruction>
<brief>
Brief:
This is a reminder trigger for a product added to the wishlist. The main goal is to draw the user's attention to the product/products they added to their favorites. Communication is done by sending 1 reminder email.
</brief>

<start_trigger>
It should start for wishlist reminder segment once a day (any day of week) starting from tomorrow at 15:00, but no more than once a week for the specific contact (ignore idempotency guard).
</start_trigger>

<generation_plan>
The main flow should follow:
Send the email and then complete the script
</generation_plan>
</trigger_instruction>
