import json
from transformers import GPT2Tokenizer

# Initialize the tokenizer
tokenizer = GPT2Tokenizer.from_pretrained('gpt2')

# Function to count tokens using the tokenizer
def count_tokens_with_tokenizer(text):
    return len(tokenizer.encode(text))

# Path to your .jsonl file
jsonl_file_path = './midi_dataset.jsonl'

# Training parameters
max_tokens_gpt_3_5_turbo_1106 = 16385
max_tokens_gpt_3_5_turbo_0613 = 4096
cost_per_1k_tokens = 0.024  # Example cost, adjust based on current pricing
num_epochs = 3  # Number of epochs for training

# Initialize total token count
total_tokens = 0

# Open and read the .jsonl file
with open(jsonl_file_path, 'r') as file:
    for line in file:
        data = json.loads(line)
        for message in data['messages']:
            total_tokens += count_tokens_with_tokenizer(message['content'])

# Check against token limits
if total_tokens > max_tokens_gpt_3_5_turbo_1106:
    print(f"Warning: Total token count exceeds the limit for gpt-3.5-turbo-1106 ({max_tokens_gpt_3_5_turbo_1106} tokens).")

if total_tokens > max_tokens_gpt_3_5_turbo_0613:
    print(f"Warning: Total token count exceeds the limit for gpt-3.5-turbo-0613 ({max_tokens_gpt_3_5_turbo_0613} tokens).")

# Estimate costs
total_cost = (total_tokens / 1000) * cost_per_1k_tokens * num_epochs
print(f"Total tokens in the file: {total_tokens}")
print(f"Estimated cost for training over {num_epochs} epochs: ~${total_cost:.2f} USD")
