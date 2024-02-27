from mido import MidiFile
import glob
import os

def export_midi_to_txt(midi_file_path):
    midi_file = MidiFile(midi_file_path)
    txt_file_path = midi_file_path.replace('.mid', '.txt')

    with open(txt_file_path, 'w') as txt_file:
        for i, track in enumerate(midi_file.tracks):
            time = 0  # Cumulative time in ticks
            for msg in track:
                time += msg.time  # Increment time by delta time of the message
                if msg.type in ['note_on', 'note_off']:
                    # Convert 'note_on' with velocity 0 to 'note_off'
                    msg_type = 'NoteOff' if (msg.type == 'note_on' and msg.velocity == 0) else msg.type
                    msg_type = 'NoteOn' if msg_type == 'note_on' else msg_type
                    txt_file.write(f"{time}, {msg_type}, {msg.note}, {msg.velocity}\n")

def process_all_mid_files(folder_path):
    # List all .mid files in the folder
    midi_files = glob.glob(os.path.join(folder_path, '*.mid'))
    
    for midi_file in midi_files:
        export_midi_to_txt(midi_file)
        print(f"Processed {midi_file}")

# Specify the folder containing your .mid files
folder_path = './midis/'
process_all_mid_files(folder_path)


