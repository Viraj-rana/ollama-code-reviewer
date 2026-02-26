# Telegram backend integration for reverse merge request review through bot

## How does it work 

User / Developer send the message to dedicated @bot /start , /review <mr link>
 and bot will polling the merge request send this merge request to our backend fastapi 
 review the merge request and send it for review to our Code review ai , while its processing
 user will getting runtime notification that mr is processing.

 phase-2 Code review AI review the merge request prepare report and send back to the telegram bot 
 with review result 
