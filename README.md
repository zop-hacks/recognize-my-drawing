# Recognize My Drawing - An app that recognizes your drawings using a CNN
---
### How did I make the ML model?
The model was made using the original dataset from quick draw. which is in an ndjson format, stored similarly to an svg. I made a script and converted this data into images (64 x 64 grayscale), and then created a CNN model using pytorch see [pytorch_train.ipynb](ml/pytorch_train.ipynb).
I only chose 6 classes, and 20K images per class. and the model came out even better than I anticipated. it even managed to get 96.93% on the test dataset.
!(model training and eval preformance)[assets\model-training-preformance.png]
### How does the app work?
My app is made from a FastAPI backend and a Nextjs frontend.

Whenever a player enters the {website_url}/play, or refreshes the prompts on the website, it fetches 4 random items from the backend, by calling generate_items().

Then, when a player clicks on play, the page changes the phase into a game phase which shows a canvas for the player to draw on, a timer, and the current prompt.

Whenever either a player either stops holding the pen, or a 0.5s interval finishes within the frontend, it sends a (64 x 64) image to the server (predict_file()), which returns the label that the model thinks is the closest to one of the 6 classes of objects. which the frontend determines whether it's the correct label or not, and displays it as a pop up below. In both a correct guess, and a timer runout, the canvas is erased, and the next prompt is displayed to the player.

This goes on for all of the prompts, until the end of the game. which then displays a summary of the game.

If you wanna know more, I recommend you to take a look at [routes.py (backend)](backend/app/api/v1/routes.py), and [page.tsx](frontend/app/play/page.tsx), or contact me.

fun fact: the canvas is displaying a way higher resolution than what's eventually being sent to the server, in order for the canvas to not look pixelated, while keeping the model size small.
### Tech Stack
1. Pytorch for ML (CNN)
2. FastAPI Backend
3. Nextjs Frontend

### Credits
for the amazing team at Google that made Quick Draw, and published the dataset for everyone to use.
