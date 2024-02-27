import pretty_midi
import os
import json

def midi_to_text_representation(midi_path, title, max_notes=None):
    try:
        midi_data = pretty_midi.PrettyMIDI(midi_path)
        text_representation = ["#MIDI"]
        note_count = 0  # Initialize note count for this song

        for instrument in midi_data.instruments:
            for note in instrument.notes:
                # Stop adding notes if max_notes is defined and reached
                if max_notes is not None and note_count >= max_notes:
                    break
                text_representation.append(f"{note.start:.2f}, NoteOn, {note.pitch}, {note.velocity}")
                text_representation.append(f"{note.end:.2f}, NoteOff, {note.pitch}, 0")
                note_count += 1
                if max_notes is not None and note_count >= max_notes:
                    # If max notes reached, exit the loop
                    break

        text_representation.append("##MIDI")
        return "\n".join(text_representation)
    except Exception as e:
        print(f"Error processing {midi_path}: {e}. Deleting file.")
        os.remove(midi_path)  # Delete the offending file
        return None

midi_dir = './midis'
max_notes_per_song = 80  # Set the maximum number of notes to be analyzed per song
max_songs_to_analyze = 11  # Set the maximum number of songs to be analyzed

# Get the MIDI files for processing
midi_files = [os.path.join(root, file) for root, dirs, files in os.walk(midi_dir) for file in files if file.endswith('.mid')]

total_files = len(midi_files)
print(f"Total MIDI files to process: {total_files}")

# Limit the number of songs to process based on max_songs_to_analyze
midi_files = midi_files[:max_songs_to_analyze]

with open('midi_dataset.jsonl', 'w') as outfile:
    for i, midi_path in enumerate(midi_files, 1):  # Start enumeration at 1
        title = os.path.splitext(os.path.basename(midi_path))[0]  # Extracts the file name without the extension
        print(f"Processing {i}/{len(midi_files)}: {midi_path}")
        text_repr = midi_to_text_representation(midi_path, title, max_notes_per_song)

        if text_repr:
            # Construct system, user, and assistant messages
            messages = [
                {"role": "system", "content": "Provide a MIDI sequence following this example:  #MIDI 0000, NoteOn, 60, 90 0500, NoteOff, 60, 0 ...... ##MIDI Every midi sequence with #MIDI and finish it with ##MIDI"},
                {"role": "user", "content": f"Given the title: '{title}' create a beautiful MIDI sequence."},
                {"role": "assistant", "content": text_repr}
            ]
            json_line = json.dumps({"messages": messages})
            outfile.write(json_line + '\n')
        else:
            print(f"Skipping {midi_path} due to error.")
