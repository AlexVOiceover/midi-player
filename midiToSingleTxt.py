from mido import MidiFile
import os

def export_midi_to_txt(midi_file_path, output_txt_file):
    artist_name = os.path.basename(os.path.dirname(midi_file_path))
    song_name = os.path.basename(midi_file_path).replace('.mid', '')
    
    midi_file = MidiFile(midi_file_path)

    with open(output_txt_file, 'a') as txt_file:
        txt_file.write(f"{artist_name} - {song_name}\n#MIDI\n")
        for i, track in enumerate(midi_file.tracks):
            time = 0  # Cumulative time in ticks
            for msg in track:
                if msg.type in ['note_on', 'note_off']:
                    time += msg.time  # Increment time by delta time of the message
                    # Convert 'note_on' with velocity 0 to 'note_off'
                    msg_type = 'NoteOff' if (msg.type == 'note_on' and msg.velocity == 0) else msg.type
                    msg_type = 'NoteOn' if msg_type == 'note_on' else msg_type
                    txt_file.write(f"{time}, {msg_type}, {msg.note}, {msg.velocity}\n")
        txt_file.write("##MIDI\n\n")

def process_all_mid_files(folder_path, output_txt_file):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.mid'):
                midi_file_path = os.path.join(root, file)
                export_midi_to_txt(midi_file_path, output_txt_file)
                print(f"Processed {midi_file_path}")

# Specify the folder containing your .mid files and the output .txt file path
folder_path = './midis/'
output_txt_file = 'midi_sequences.txt'
# Clear the output file content before starting
open(output_txt_file, 'w').close()
process_all_mid_files(folder_path, output_txt_file)
