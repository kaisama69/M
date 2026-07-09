import json
import itertools
import random
import os

# Define building blocks for permutations
subjects = ["I", "I'm", "I am", "My", "I feel like I am"]
feelings = ["feel", "am feeling", "am", "have been feeling", "just feel", "currently feel"]
time_words = ["", "right now", "today", "lately", "these days", "at the moment", "this morning", "tonight", "all day"]
punctuations = ["", ".", "!", "..."]

# Intent specific vocab
anxiety_words = ["anxious", "stressed", "stressed out", "overwhelmed", "panicking", "worried", "nervous", "uneasy", "tense"]
sad_words = ["sad", "depressed", "down", "terrible", "miserable", "hopeless", "empty", "lonely", "unhappy", "heartbroken"]
happy_words = ["happy", "great", "amazing", "joyful", "peaceful", "calm", "content", "wonderful", "fantastic", "good"]
suicidal_words = ["want to die", "want to end it all", "can't take this anymore", "wish I wasn't here", "want to kill myself", "want to disappear", "have no reason to live"]

# Helper to generate permutations
def generate_phrases(subj_list, feel_list, emotion_list, time_list, punct_list):
    phrases = []
    for s, f, e, t, p in itertools.product(subj_list, feel_list, emotion_list, time_list, punct_list):
        # Format grammar based on subject/verb
        if s == "My":
            phrase = f"{s} life is {e} {t}{p}"
        elif "feel" in f:
            phrase = f"{s} {f} {e} {t}{p}"
        else:
            phrase = f"{s} {f} {e} {t}{p}"
        # clean up double spaces
        phrase = " ".join(phrase.split())
        phrases.append(phrase)
    return phrases

def generate_direct_phrases(phrases_list, punct_list):
    phrases = []
    for p, punct in itertools.product(phrases_list, punct_list):
        phrases.append(f"{p}{punct}")
    return phrases

def build_dataset():
    data = []
    
    # 1. Anxious
    anxious_phrases = generate_phrases(["I", "I am", "I feel like I am"], feelings, anxiety_words, time_words, punctuations)
    anxious_phrases += generate_direct_phrases(["My heart is racing", "I can't calm down", "I am having a panic attack", "Everything is too much", "I can't breathe well"], time_words)
    
    # 2. Sad
    sad_phrases = generate_phrases(["I", "I am", "I'm"], feelings, sad_words, time_words, punctuations)
    sad_phrases += generate_direct_phrases(["I don't want to do anything", "I can't stop crying", "Life is hard", "I have no motivation"], time_words)
    
    # 3. Happy
    happy_phrases = generate_phrases(["I", "I am", "I'm"], feelings, happy_words, time_words, punctuations)
    happy_phrases += generate_direct_phrases(["Today was amazing", "Things are going well", "I accomplished a lot", "I smiled today", "Life is good"], time_words)
    
    # 4. Suicidal
    suicidal_phrases = generate_direct_phrases([f"I {word}" for word in suicidal_words], time_words)
    suicidal_phrases += generate_direct_phrases(["No one cares if I die", "The world would be better without me", "I am a burden", "I want it to end"], punctuations)
    
    # 5. Greeting
    greetings = generate_direct_phrases(["Hi", "Hello", "Hey", "Good morning", "Good evening", "Hi there", "Hey MindScale", "Hi bot", "Greetings", "Yo"], punctuations)
    
    # 6. Goodbye
    goodbyes = generate_direct_phrases(["Bye", "See you later", "Goodbye", "I'm leaving", "Talk to you later", "Good night", "Got to go", "Bye bye", "Catch you later", "Farewell"], punctuations)
    
    # 7. Breathing
    breathing_phrases = generate_direct_phrases(["Help me breathe", "I need a breathing exercise", "How do I calm down", "Let's do some breathing", "Guide me through breathing", "I want to relax", "Breathing technique", "Help me relax"], punctuations)
    
    # 8. Help
    help_phrases = generate_direct_phrases(["I need help", "Help me", "What can you do", "I don't know what to do", "Support me", "Who are you", "I need someone to talk to", "Can you help me", "I am lost"], punctuations)

    intents_dict = [
        ("anxious", anxious_phrases),
        ("sad", sad_phrases),
        ("happy", happy_phrases),
        ("suicidal", suicidal_phrases),
        ("greeting", greetings),
        ("goodbye", goodbyes),
        ("breathing_request", breathing_phrases),
        ("help", help_phrases)
    ]

    # Subsample or take all. The combinations produce a massive amount.
    dataset_out = {"intents": []}
    
    responses = {
        "greeting": [
            "Hello! I'm your MindScale companion. How are you feeling today?",
            "Hi there! How can I support you right now?",
            "Hey! I'm here for you. What's on your mind?"
        ],
        "goodbye": [
            "Goodbye! Remember, taking it one step at a time is enough. I'll be here if you need me.",
            "Take care! Have a peaceful rest of your day.",
            "Bye for now! Stay mindful."
        ],
        "anxious": [
            "I hear you. Anxiety can be really overwhelming. Let's try to ground ourselves. Can you name 3 things you see around you right now?",
            "It's okay to feel this way. You are safe. Try taking a slow, deep breath in through your nose for 4 seconds, and out through your mouth for 8 seconds.",
            "I'm here with you. When things feel too fast, try focusing on the physical sensation of your feet on the floor."
        ],
        "sad": [
            "I'm so sorry you're feeling this way. It's okay not to be okay. I'm here to listen.",
            "That sounds really heavy. You don't have to carry it all right now. Be gentle with yourself today.",
            "Your feelings are completely valid. Sometimes just letting yourself feel sad is the first step. Is there anything small that might bring you a little comfort right now?"
        ],
        "happy": [
            "That's wonderful to hear! Hold onto that feeling.",
            "I love hearing that! It's so important to recognize and celebrate the good days.",
            "That is amazing! Positive moments like this are worth cherishing."
        ],
        "breathing_request": [
            "Let's do the 4-7-8 method. Inhale quietly through your nose for 4 seconds... Hold your breath for 7 seconds... Exhale completely through your mouth for 8 seconds. Repeat 3 times.",
            "Let's try Box Breathing. Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, and hold empty for 4 seconds. Let's start...",
            "Close your eyes if you can. Take a deep breath in... and let it out slowly. Focus only on the air moving in and out."
        ],
        "help": [
            "I am your AI companion for MindScale. You can tell me how you feel, vent to me, or ask for a breathing exercise. I'm here to listen.",
            "I'm here to support you. You can talk to me about your stress, ask for relaxation techniques, or just vent. How are you feeling?"
        ],
        "suicidal": [
            "You are not alone, and your life has value. Please, reach out for help immediately. Call or text 988 (in the US/Canada) to reach the Suicide & Crisis Lifeline. They are available 24/7.",
            "I care about you, and I want you to be safe. Please contact emergency services or a crisis helpline right away. Help is available.",
            "This sounds like a crisis. Please don't face this alone. Call 988 or text HOME to 741741 to connect with a crisis counselor."
        ]
    }
    
    total_samples = 0
    for intent_name, phrases in intents_dict:
        # We want to ensure we have a good distribution but easily hit 10k+.
        # We will deduplicate them.
        unique_phrases = list(set(phrases))
        
        # We can shuffle and cap them at a certain amount if needed, 
        # We can shuffle and include all of them to get a huge dataset.
        random.shuffle(unique_phrases)
        selected = unique_phrases
        
        dataset_out["intents"].append({
            "intent": intent_name,
            "patterns": selected,
            "responses": responses[intent_name]
        })
        total_samples += len(selected)
        print(f"Generated {len(selected)} samples for {intent_name}")
        
    print(f"Total samples: {total_samples}")
    
    out_path = os.path.join(os.path.dirname(__file__), 'chat_intents.json')
    with open(out_path, 'w') as f:
        json.dump(dataset_out, f, indent=2)

if __name__ == "__main__":
    build_dataset()
