from flask import Flask, request, send_file, jsonify
import os
import cv2
import math
import shutil
import base64
import numpy as np
import colorsys
import uuid
from stegano import lsb
from cryptography.hazmat.primitives.asymmetric import rsa, padding as rsa_padding
from cryptography.hazmat.primitives import serialization, hashes
from werkzeug.utils import secure_filename
from flask_cors import CORS
from datetime import datetime
import subprocess
from werkzeug.datastructures import FileStorage
from io import BytesIO


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# You can also manually set CORS headers in each response if needed
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Configure upload settings
UPLOAD_FOLDER = './uploads'
TEMP_FOLDER = './tmp'
KEYS_FOLDER = './keys'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(KEYS_FOLDER, exist_ok=True)

def convert_to_mp4(mov_path, output_dir):
    """Convert MOV file to MP4 using ffmpeg"""
    # Create the output path with .mp4 extension
    mp4_path = mov_path.rsplit('.', 1)[0] + '.mp4'
    
    try:
        # Use ffmpeg to convert from MOV to MP4
        # -c:v libx264 uses H.264 codec for video
        # -crf 23 is a good balance between quality and file size
        # -preset fast provides a good encoding speed
        # -c:a aac uses AAC codec for audio
        # -b:a 128k sets audio bitrate
        command = [
            'ffmpeg',
            '-i', mov_path,
            '-c:v', 'libx264',
            '-crf', '23',
            '-preset', 'fast',
            '-c:a', 'aac',
            '-b:a', '128k',
            mp4_path
        ]
        
        # Execute the command
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            print(f"Error converting video: {stderr.decode()}")
            return None
        
        print(f"Successfully converted {mov_path} to {mp4_path}")
        return mp4_path
    except Exception as e:
        print(f"Error during conversion: {str(e)}")
        return None

# RSA encryption and decryption functions
def generate_keys(key_size=2048):
    """Generate RSA key pair if they don't exist"""
    private_keys_path = os.path.join(KEYS_FOLDER, f'private_key_{key_size}.pem')
    public_keys_path = os.path.join(KEYS_FOLDER, f'public_key_{key_size}.pem')
    
    if os.path.isfile(private_keys_path) and os.path.isfile(public_keys_path):
        print("Public and private keys already exist")
        return
    
    # Generate a private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
    )
    
    # Get the public key
    public_key = private_key.public_key()
    
    # Serialize and save the private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    with open(private_keys_path, "wb") as file_obj:
        file_obj.write(private_pem)
    
    # Serialize and save the public key
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    with open(public_keys_path, "wb") as file_obj:
        file_obj.write(public_pem)
    
    print(f"Public and Private keys created with size {key_size}")

def encrypt_rsa(message):
    """Encrypt message using RSA"""
    key_size = 2048
    # Ensure keys exist
    generate_keys(key_size)
    
    # Read public key
    public_key_path = os.path.join(KEYS_FOLDER, f'public_key_{key_size}.pem')
    with open(public_key_path, 'rb') as key_file:
        public_key = serialization.load_pem_public_key(key_file.read())
    
    # Encrypt the message
    message_bytes = message.encode('utf-8') if isinstance(message, str) else message
    ciphertext = public_key.encrypt(
        message_bytes,
        rsa_padding.OAEP(
            mgf=rsa_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Encode in base64
    return base64.b64encode(ciphertext)

def decrypt_rsa(encoded_message):
    """Decrypt message using RSA"""
    key_size = 2048
    # Ensure keys exist
    generate_keys(key_size)
    
    # Set private key path
    private_key_path = os.path.join(KEYS_FOLDER, f'private_key_{key_size}.pem')
    
    # Read private key
    with open(private_key_path, 'rb') as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )
    
    # Decode base64 if needed
    if isinstance(encoded_message, str):
        encoded_message = encoded_message.encode('utf-8')
    
    cipher_text = base64.b64decode(encoded_message)
    
    # Decrypt the message
    plain_text = private_key.decrypt(
        cipher_text,
        rsa_padding.OAEP(
            mgf=rsa_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return plain_text

# Video processing functions
def split_string(s_str, count=10):
    """Split string into parts"""
    per_c = math.ceil(len(s_str)/count)
    c_cout = 0
    out_str = ''
    split_list = []
    for s in s_str:
        out_str += s
        c_cout += 1
        if c_cout == per_c:
            split_list.append(out_str)
            out_str = ''
            c_cout = 0
    if c_cout != 0:
        split_list.append(out_str)
    return split_list

def extract_frames(video_path, temp_dir):
    """Extract frames from video"""
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    print(f"[INFO] Extracting frames from video {video_path}")
    vidcap = cv2.VideoCapture(video_path)
    count = 0
    frames = []
    
    while True:
        success, image = vidcap.read()
        if not success:
            break
        frame_path = os.path.join(temp_dir, f"{count}.png")
        cv2.imwrite(frame_path, image)
        frames.append(frame_path)
        count += 1
    
    print(f"[INFO] Extracted {count} frames from video")
    return frames, count

def encode_frames(frames, encrypted_text, temp_dir):
    """Encode encrypted text into frames"""
    # Convert to string if it's bytes
    if isinstance(encrypted_text, bytes):
        encrypted_text = encrypted_text.decode('utf-8')
        
    # Split the text into parts
    split_text_list = split_string(encrypted_text)
    num_parts = len(split_text_list)
    
    # Use the first N frames (N = number of text parts)
    frame_numbers = list(range(min(num_parts, len(frames))))
    
    print(f"Encoding text into {len(frame_numbers)} frames")
    
    # Hide text parts in frames
    for i, frame_num in enumerate(frame_numbers):
        if i >= len(split_text_list):
            break
            
        frame_path = frames[frame_num]
        # Hide text in frame using LSB steganography
        secret_enc = lsb.hide(frame_path, split_text_list[i])
        secret_enc.save(frame_path)
        print(f"[INFO] Frame {frame_num} holds {split_text_list[i]}")
    
    # Save the frame numbers in a special metadata frame
    # This will help with faster decryption
    metadata_frame_path = os.path.join(temp_dir, "metadata.png")
    # Create a simple black image for metadata
    metadata_img = cv2.imread(frames[0])
    cv2.imwrite(metadata_frame_path, metadata_img)
    
    # Save frame numbers as metadata
    metadata_content = ",".join(map(str, frame_numbers))
    metadata_secret = lsb.hide(metadata_frame_path, metadata_content)
    metadata_secret.save(metadata_frame_path)
    print(f"[INFO] Metadata frame holds frame numbers: {metadata_content}")
    
    # Insert the metadata frame as the last frame to process
    frames.append(metadata_frame_path)
        
    return frame_numbers

def create_output_video(frames, original_video, output_path):
    """Create output video from frames"""
    # Get video properties
    video = cv2.VideoCapture(original_video)
    fps = video.get(cv2.CAP_PROP_FPS)
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Ensure output path ends with .mov
    if not output_path.endswith('.mov'):
        output_path = output_path.rsplit('.', 1)[0] + '.mov'
    
    # Create video writer with PNG codec for MOV container
    # This preserves image quality better for steganography
    fourcc = cv2.VideoWriter_fourcc(*'png ')  # PNG codec with MOV container
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    # Add frames to video
    for frame_path in frames:
        frame = cv2.imread(frame_path)
        if frame is not None:
            out.write(frame)
    
    out.release()
    print(f"[INFO] Created output video: {output_path}")
    return output_path

def decode_video(video_path, temp_dir):
    """Decode hidden text from video"""
    # Create a temporary directory similar to the original code
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    # Extract frames using OpenCV directly
    cap = cv2.VideoCapture(video_path)
    number_of_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"[INFO] Video has {number_of_frames} frames")
    
    # Check for data in borders first
    border_data = extract_border_data(video_path, temp_dir)
    if border_data:
        print(f"[INFO] Extracted data from borders: {border_data[:30]}...")
    
    # First check if there's a metadata frame by looking at the last frames
    metadata_frame_numbers = []
    
    # Check the last 5 frames for metadata
    print("[INFO] Looking for metadata frame...")
    for frame_index in range(max(0, number_of_frames - 5), number_of_frames):
        # Jump to frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ret, frame = cap.read()
        if not ret:
            continue
            
        # Save frame and try to decode it
        metadata_frame_path = os.path.join(temp_dir, f"metadata_check_{frame_index}.png")
        cv2.imwrite(metadata_frame_path, frame)
        
        try:
            metadata_content = lsb.reveal(metadata_frame_path)
            if metadata_content and ',' in metadata_content:
                # This looks like our metadata frame
                print(f"[INFO] Found potential metadata at frame {frame_index}: {metadata_content}")
                try:
                    # Try to parse the frame numbers
                    frame_nums = [int(num) for num in metadata_content.split(',')]
                    metadata_frame_numbers = frame_nums
                    print(f"[INFO] Using frame numbers from metadata: {frame_nums}")
                    break
                except:
                    print(f"[INFO] Failed to parse metadata numbers: {metadata_content}")
        except Exception as e:
            pass
    
    # Reset the video capture
    cap.release()
    cap = cv2.VideoCapture(video_path)
    
    # Frames to check - either from metadata or first 15 frames if no metadata
    frames_to_check = metadata_frame_numbers if metadata_frame_numbers else list(range(15))
    print(f"[INFO] Will check these frames: {frames_to_check}")
    
    # Process frames - using targeted frame extraction if metadata is available
    decoded = {}
    
    for frame_number in frames_to_check:
        if frame_number >= number_of_frames:
            print(f"[WARNING] Frame number {frame_number} exceeds video length")
            continue
            
        # Jump to the specific frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        if not ret:
            print(f"[ERROR] Could not read frame {frame_number}")
            continue
        
        encoded_frame_file_name = os.path.join(temp_dir, f"{frame_number}-enc.png")
        cv2.imwrite(encoded_frame_file_name, frame)
        
        # Try to decode the frame
        try:
            clear_message = lsb.reveal(encoded_frame_file_name)
            if clear_message:
                decoded[frame_number] = clear_message
                print(f"Frame {frame_number} DECODED: {clear_message}")
        except Exception as e:
            print(f"Error decoding frame {frame_number}: {e}")
    
    # Arrange and decrypt the message
    res = ""
    for fn in sorted(decoded.keys()):
        res += decoded[fn]
    
    if not res:
        return border_data if border_data else None  # If no steganography data found, return border data
    
    try:
        # Try to decrypt the message
        decrypted_message = decrypt_rsa(res)
        return decrypted_message.decode('utf-8')
    except Exception as e:
        print(f"Error decrypting message: {e}")
        # If decryption fails but we have border data, return that instead
        if border_data:
            print(f"[INFO] Returning border data instead: {border_data[:30]}...")
            return border_data
        return res  # Otherwise return the encoded message

def text_to_binary(text):
    """Convert text to binary string"""
    if isinstance(text, str):
        text = text.encode('utf-8')
    return ''.join(format(byte, '08b') for byte in text)

def binary_to_text(binary):
    """Convert binary string to text with basic error handling"""
    if not binary or len(binary) < 8:
        return ""
        
    # Make sure binary string length is a multiple of 8
    binary = binary.ljust((len(binary) // 8 + 1) * 8, '0')
    
    # Group into bytes
    bytes_list = [binary[i:i+8] for i in range(0, len(binary), 8)]
    
    # Convert each byte to a character
    text = ""
    for byte in bytes_list:
        try:
            # Convert binary to integer, then to character
            char_code = int(byte, 2)
            # Only keep printable ASCII characters
            if 32 <= char_code <= 126:
                text += chr(char_code)
        except ValueError:
            pass
    
    return text

def create_data_border(frame, data, frame_index, total_frames, border_width=20):
    """Create border that encodes data in the top-left corner while adding decorative elements elsewhere"""
    # Make a copy to avoid modifying the original
    bordered_frame = frame.copy()
    height, width = bordered_frame.shape[:2]
    
    # Convert data to binary
    binary_data = text_to_binary(data)
    
    # Calculate which portion of the data to encode in this frame
    bits_per_frame = min(len(binary_data), (2 * (width + height) - 4 * border_width) // 2)
    start_index = (frame_index * bits_per_frame // 3) % len(binary_data)  # Overlap by 2/3 for redundancy
    
    # Extract the portion of data for this frame
    frame_data = binary_data[start_index:start_index + bits_per_frame]
    if len(frame_data) < bits_per_frame:
        frame_data += binary_data[:bits_per_frame - len(frame_data)]  # Wrap around
    
    # Generate colors for 0 and 1 bits
    # Use frame index to create subtle color variations between frames
    hue_shift = (frame_index / total_frames) * 0.3  # Shift hue by up to 0.3
    
    # Color for '0' bit - dark blue to purple range
    zero_hue = (0.6 + hue_shift) % 1.0
    zero_color = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(zero_hue, 0.7, 0.4))
    zero_color = (zero_color[2], zero_color[1], zero_color[0])  # Convert to BGR
    
    # Color for '1' bit - orange to red range
    one_hue = (0.05 + hue_shift) % 1.0
    one_color = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(one_hue, 0.9, 0.7))
    one_color = (one_color[2], one_color[1], one_color[0])  # Convert to BGR
    
    # Calculate the corner size
    corner_size = border_width * 2
    
    # KEEP EXISTING TOP-LEFT CORNER ENCODING (DON'T MODIFY THIS PART)
    # Encode data in the top-left corner only
    data_pos = 0
    segment_width = 2  # Each bit takes 2 pixels width
    
    # Top-left corner area
    for y in range(corner_size):
        for x in range(corner_size):
            if data_pos < len(frame_data):
                bit = int(frame_data[data_pos])
                color = one_color if bit else zero_color
                bordered_frame[y, x] = color
                data_pos += 1
    
    # ADD DECORATIVE CORNERS TO THE OTHER THREE CORNERS
    # These won't contain actual data but will help with corner detection
    
    # Top-right corner (decorative)
    tr_color = (30, 180, 30)  # Green
    cv2.rectangle(bordered_frame, (width - corner_size, 0), (width, corner_size), tr_color, -1)
    # Add diagonal lines for a distinctive pattern
    for i in range(0, corner_size, 4):
        cv2.line(bordered_frame, (width - corner_size, i), (width - corner_size + i, 0), (255, 255, 255), 1)
    
    # Bottom-left corner (decorative)
    bl_color = (180, 30, 30)  # Blue
    cv2.rectangle(bordered_frame, (0, height - corner_size), (corner_size, height), bl_color, -1)
    # Add circular pattern
    cv2.circle(bordered_frame, (corner_size // 2, height - corner_size // 2), 
               corner_size // 3, (255, 255, 255), 2)
    
    # Bottom-right corner (decorative)
    br_color = (180, 180, 30)  # Cyan
    cv2.rectangle(bordered_frame, (width - corner_size, height - corner_size), (width, height), br_color, -1)
    # Add square pattern
    cv2.rectangle(bordered_frame, (width - corner_size + 5, height - corner_size + 5), 
                 (width - 5, height - 5), (255, 255, 255), 2)
    
    # ADD TRANSLUCENT DECORATIVE ELEMENTS TO THE REST OF THE BORDER
    # This makes it look like there's data without actually encoding anything
    
    # Create a border overlay for translucent effects
    border_overlay = bordered_frame.copy()
    
    # Top border (excluding corners)
    for x in range(corner_size, width - corner_size, segment_width * 2):
        # Random-looking pattern based on position and frame
        pattern_value = (x + frame_index) % 8  
        if pattern_value < 4:  # Create alternating pattern
            color = (30 + pattern_value * 20, 30 + pattern_value * 10, 150 - pattern_value * 10)
            cv2.rectangle(border_overlay, (x, 0), (x + segment_width * 2 - 1, border_width - 1), color, -1)
    
    # Right border (excluding corners)
    for y in range(corner_size, height - corner_size, segment_width * 2):
        pattern_value = (y + frame_index) % 8
        if pattern_value < 4:
            color = (30 + pattern_value * 10, 150 - pattern_value * 10, 30 + pattern_value * 20)
            cv2.rectangle(border_overlay, (width - border_width, y), 
                         (width - 1, y + segment_width * 2 - 1), color, -1)
    
    # Bottom border (excluding corners)
    for x in range(width - corner_size, corner_size, -(segment_width * 2)):
        pattern_value = (x + frame_index) % 8
        if pattern_value < 4:
            color = (150 - pattern_value * 10, 30 + pattern_value * 10, 30 + pattern_value * 20)
            cv2.rectangle(border_overlay, (x - segment_width * 2 + 1, height - border_width), 
                         (x, height - 1), color, -1)
    
    # Left border (excluding corners)
    for y in range(height - corner_size, corner_size, -(segment_width * 2)):
        pattern_value = (y + frame_index) % 8
        if pattern_value < 4:
            color = (30 + pattern_value * 20, 150 - pattern_value * 10, 30 + pattern_value * 10)
            cv2.rectangle(border_overlay, (0, y - segment_width * 2 + 1), 
                         (border_width - 1, y), color, -1)
    
    # Blend the overlay with the original frame for translucent effect
    alpha = 0.6  # Translucency level (0.0 to 1.0)
    # Apply the translucent border overlay to the bordered frame
    # But preserve the top-left corner which contains actual data
    
    # Top border (excluding corners)
    mask = np.zeros_like(bordered_frame, dtype=bool)
    mask[0:border_width, corner_size:width-corner_size] = True
    bordered_frame[mask] = cv2.addWeighted(bordered_frame, 1-alpha, border_overlay, alpha, 0)[mask]
    
    # Right border (excluding corners)
    mask = np.zeros_like(bordered_frame, dtype=bool)
    mask[corner_size:height-corner_size, width-border_width:width] = True
    bordered_frame[mask] = cv2.addWeighted(bordered_frame, 1-alpha, border_overlay, alpha, 0)[mask]
    
    # Bottom border (excluding corners)
    mask = np.zeros_like(bordered_frame, dtype=bool)
    mask[height-border_width:height, corner_size:width-corner_size] = True
    bordered_frame[mask] = cv2.addWeighted(bordered_frame, 1-alpha, border_overlay, alpha, 0)[mask]
    
    # Left border (excluding corners)
    mask = np.zeros_like(bordered_frame, dtype=bool)
    mask[corner_size:height-corner_size, 0:border_width] = True
    bordered_frame[mask] = cv2.addWeighted(bordered_frame, 1-alpha, border_overlay, alpha, 0)[mask]
    
    return bordered_frame

def create_data_corners(frame, frame_index, total_frames, border_width=20):
    """Create corners that encode frame information"""
    height, width = frame.shape[:2]
    corner_size = border_width * 2
    
    # Convert frame index to 16-bit binary
    frame_binary = format(frame_index, '016b')
    
    # Convert total frames to 16-bit binary
    total_binary = format(min(total_frames, 65535), '016b')
    
    # Vibrant corner colors that stand out
    corner_colors = [
        (30, 30, 180),   # Top-left: Red
        (30, 180, 30),   # Top-right: Green
        (180, 30, 30),   # Bottom-left: Blue
        (180, 180, 30)   # Bottom-right: Cyan
    ]
    
    # Corner positions
    corners = [
        (0, 0),                            # Top-left
        (width - corner_size, 0),          # Top-right
        (0, height - corner_size),         # Bottom-left
        (width - corner_size, height - corner_size)  # Bottom-right
    ]
    
    # Encode data in each corner
    for i, (x, y) in enumerate(corners):
        # Fill corner background
        cv2.rectangle(frame, (x, y), (x + corner_size, y + corner_size), corner_colors[i], -1)
        
        # Encode frame index in top two corners
        if i < 2:
            for bit_idx, bit in enumerate(frame_binary[:8] if i == 0 else frame_binary[8:]):
                # Calculate grid position (4x2 grid)
                grid_x = bit_idx % 4
                grid_y = bit_idx // 4
                # Calculate pixel position
                px = x + grid_x * (corner_size // 4) + corner_size // 8
                py = y + grid_y * (corner_size // 2) + corner_size // 4
                # Draw white dot for 1, black dot for 0
                color = (255, 255, 255) if bit == '1' else (0, 0, 0)
                cv2.circle(frame, (px, py), corner_size // 10, color, -1)
        
        # Encode total frames in bottom two corners
        else:
            for bit_idx, bit in enumerate(total_binary[:8] if i == 2 else total_binary[8:]):
                # Calculate grid position (4x2 grid)
                grid_x = bit_idx % 4
                grid_y = bit_idx // 4
                # Calculate pixel position
                px = x + grid_x * (corner_size // 4) + corner_size // 8
                py = y + grid_y * (corner_size // 2) + corner_size // 4
                # Draw white dot for 1, black dot for 0
                color = (255, 255, 255) if bit == '1' else (0, 0, 0)
                cv2.circle(frame, (px, py), corner_size // 10, color, -1)
    
    return frame

def add_data_border_to_frames(frames, data, temp_dir):
    """Add data-encoding border to all frames"""
    bordered_frames = []
    
    # Set a reasonable border width
    border_width = 20
    
    # Get total frame count
    total_frames = len(frames)
    
    # Prepare the data to encode with STEGO marker
    full_data = f"STEGO:{data}"
    print(f"[INFO] Encoding data in border: {full_data[:50]}...")
    
    # Process each frame
    for i, frame_path in enumerate(frames):
        # Read frame
        frame = cv2.imread(frame_path)
        if frame is None:
            continue
        
        # Create border with encoded data in top-left corner only
        bordered_frame = create_data_border(frame, full_data, i, total_frames, border_width)
        
        # Save the bordered frame
        bordered_path = os.path.join(temp_dir, f"bordered_{i}.png")
        cv2.imwrite(bordered_path, bordered_frame)
        bordered_frames.append(bordered_path)
        
        # Log progress
        if i % 10 == 0:
            print(f"[INFO] Added data border to frame {i}/{total_frames}")
    
    print(f"[INFO] Added data borders to all {len(bordered_frames)} frames")
    return bordered_frames
def detect_border_in_frame(frame):
    """Detect if a frame has our specific encoding pattern in the top-left corner"""
    # Get frame dimensions
    height, width = frame.shape[:2]
    border_width = 20
    corner_size = border_width * 2
    
    # Check if corners exist
    if width < corner_size or height < corner_size:
        return False
    
    # Extract the top-left corner
    top_left = frame[0:corner_size, 0:corner_size]
    
    # Check for distinctive color patterns specific to our encoding
    avg_colors = np.mean(top_left, axis=(0, 1))
    color_std = np.std(top_left, axis=(0, 1))
    
    # Our encoding should have:
    # 1. Significant color variance (mix of 0 and 1 bits)
    # 2. Strong red or blue components (our bit colors)
    high_variance = np.mean(color_std) > 50
    strong_color = np.max(avg_colors) > 100
    
    # Also check for the presence of other corner markers
    # Top-right corner should be green
    if width >= corner_size*2:
        top_right = frame[0:corner_size, width-corner_size:width]
        tr_color = np.mean(top_right, axis=(0, 1))
        tr_green = tr_color[1] > tr_color[0] + 30 and tr_color[1] > tr_color[2] + 30
    else:
        tr_green = False
    
    # Either the top-left corner looks like our encoding or we also have the top-right marker
    return (high_variance and strong_color) or tr_green

def decode_corner_data(frame):
    """Decode frame index and total frames from corner markers"""
    height, width = frame.shape[:2]
    border_width = 20
    corner_size = border_width * 2
    
    # Corner positions
    corners = [
        (0, 0),                            # Top-left
        (width - corner_size, 0),          # Top-right
        (0, height - corner_size),         # Bottom-left
        (width - corner_size, height - corner_size)  # Bottom-right
    ]
    
    frame_binary_parts = ["", ""]
    total_binary_parts = ["", ""]
    
    # Decode data from each corner
    for i, (x, y) in enumerate(corners):
        corner_roi = frame[y:y+corner_size, x:x+corner_size]
        
        # Decode frame index from top two corners
        if i < 2:
            bits = ""
            for bit_idx in range(8):
                # Calculate grid position (4x2 grid)
                grid_x = bit_idx % 4
                grid_y = bit_idx // 4
                # Calculate pixel position
                px = grid_x * (corner_size // 4) + corner_size // 8
                py = grid_y * (corner_size // 2) + corner_size // 4
                # Sample pixel
                if 0 <= px < corner_size and 0 <= py < corner_size:
                    pixel = corner_roi[py, px]
                    # White means 1, black means 0
                    bit = '1' if np.mean(pixel) > 127 else '0'
                    bits += bit
            frame_binary_parts[i] = bits
        
        # Decode total frames from bottom two corners
        else:
            bits = ""
            for bit_idx in range(8):
                # Calculate grid position (4x2 grid)
                grid_x = bit_idx % 4
                grid_y = bit_idx // 4
                # Calculate pixel position
                px = grid_x * (corner_size // 4) + corner_size // 8
                py = grid_y * (corner_size // 2) + corner_size // 4
                # Sample pixel
                if 0 <= px < corner_size and 0 <= py < corner_size:
                    pixel = corner_roi[py, px]
                    # White means 1, black means 0
                    bit = '1' if np.mean(pixel) > 127 else '0'
                    bits += bit
            total_binary_parts[i-2] = bits
    
    # Combine binary parts
    frame_binary = frame_binary_parts[0] + frame_binary_parts[1]
    total_binary = total_binary_parts[0] + total_binary_parts[1]
    
    # Convert to integers
    try:
        frame_index = int(frame_binary, 2) if frame_binary else 0
        total_frames = int(total_binary, 2) if total_binary else 0
        return frame_index, total_frames
    except ValueError:
        return 0, 0

def decode_border_data(frame, border_width=20):
    """Decode data from the top-left corner only, since that's where we encode it"""
    # Get frame dimensions
    height, width = frame.shape[:2]
    corner_size = border_width * 2
    
    # Make sure the frame is large enough
    if width < corner_size or height < corner_size:
        return None
    
    # Extract the top-left corner
    top_left = frame[0:corner_size, 0:corner_size]
    
    # Function to determine if a pixel is likely a '1' bit based on color
    def is_one_bit(pixel):
        # Simple RGB check - typically our 1-bits are orange/red
        # which have high red values compared to blue
        return pixel[2] > pixel[0] + 20
    
    # Extract bits from the top-left corner, row by row
    extracted_bits = ""
    for y in range(corner_size):
        for x in range(corner_size):
            pixel = top_left[y, x]
            extracted_bits += '1' if is_one_bit(pixel) else '0'
    
    # Convert binary data to text
    print(f"[INFO] Extracted {len(extracted_bits)} bits from corner")
    extracted_text = binary_to_text(extracted_bits)
    return extracted_text

def extract_border_data(video_path, temp_dir):
    """Extract data from the top-left corner of frames"""
    # Create a temporary directory
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    cap = cv2.VideoCapture(video_path)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Sample frames throughout the video
    samples = min(10, frame_count)  # Use fewer samples for quicker processing
    sample_indices = [int(i * frame_count / samples) for i in range(samples)]
    
    print(f"[INFO] Sampling {samples} frames to extract border data")
    
    # Collect raw frame data
    raw_frames = []
    for frame_idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if ret:
            # Check if the frame has our border encoding
            if detect_border_in_frame(frame):
                raw_frames.append((frame_idx, frame))
    
    cap.release()
    
    if not raw_frames:
        return "No frames with border encoding found"
    
    # Extract texts from each frame
    frame_texts = []
    for idx, frame in raw_frames:
        text = decode_border_data(frame)
        if text:
            frame_texts.append((idx, text))
            print(f"[INFO] Frame {idx}: {text[:30]}...")
    
    if not frame_texts:
        return "No decodable border data found"
    
    # Look for "STEGO:" pattern
    stego_fragments = []
    for idx, text in frame_texts:
        if "STEGO:" in text:
            start = text.find("STEGO:")
            # Get a generous chunk after the STEGO marker
            end = min(start + 200, len(text))
            fragment = text[start:end]
            # Keep only text characters
            clean_fragment = ''.join(c for c in fragment if c.isprintable())
            stego_fragments.append(clean_fragment)
    
    if stego_fragments:
        # Return the longest clean fragment
        longest = max(stego_fragments, key=len)
        return longest
    
    # If no STEGO pattern, return concatenated text from all frames
    combined = " ".join(text for _, text in frame_texts)
    # Remove non-printable characters 
    clean_combined = ''.join(c for c in combined if c.isprintable())
    return clean_combined


# API endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for liveness check"""
    return jsonify({
        "status": "healthy",
        "service": "steganography-backend",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/encrypt', methods=['POST'])
def encrypt_endpoint():
    """Endpoint to encrypt text and hide it in video"""
    if 'video' not in request.files or 'text' not in request.form:
        return jsonify({"error": "Missing video file or text"}), 400
    
    video_file = request.files['video']
    text = request.form['text']
    
    if video_file.filename == '':
        return jsonify({"error": "No video selected"}), 400
    
    # Create temporary directory for processing
    session_id = str(uuid.uuid4())
    temp_dir = os.path.join(TEMP_FOLDER, session_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Save uploaded video
        video_path = os.path.join(temp_dir, secure_filename(video_file.filename))
        video_file.save(video_path)
        
        # Extract frames from video FIRST
        frames, _ = extract_frames(video_path, temp_dir)
        
        # Add data-encoding borders BEFORE steganography
        frames = add_data_border_to_frames(frames, text, temp_dir)
        
        # Encrypt the text using RSA AFTER borders
        encrypted_text = encrypt_rsa(text)
        
        # Encode encrypted text into frames LAST
        frame_numbers = encode_frames(frames, encrypted_text, temp_dir)
        
        # Create output video with .mov extension
        original_filename = secure_filename(video_file.filename)
        output_filename = f"encoded_{original_filename.rsplit('.', 1)[0]}.mov"
        output_path = os.path.join(temp_dir, output_filename)
        create_output_video(frames, video_path, output_path)
        
        # Convert MOV to MP4
        mp4_path = convert_to_mp4(output_path, temp_dir)
        
        # Check if MP4 conversion was successful
        if not mp4_path or not os.path.exists(mp4_path):
            return jsonify({"error": "MP4 conversion failed"}), 500
        
        # Read both files into memory
        with open(output_path, 'rb') as mov_file:
            mov_data = mov_file.read()
        
        with open(mp4_path, 'rb') as mp4_file:
            mp4_data = mp4_file.read()
        
        # Create response with both files
        response = {
            # "mov": base64.b64encode(mov_data).decode('utf-8'),
            "mp4": base64.b64encode(mp4_data).decode('utf-8'),
            # "mov_filename": output_filename,
            "mp4_filename": os.path.basename(mp4_path)
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Clean up temporary files after response is sent
        # We'll add a delay or move this to a background task in production
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
        except Exception as cleanup_error:
            print(f"Error cleaning up: {cleanup_error}")
@app.route('/decrypt', methods=['POST'])
def decrypt_endpoint():
    """Endpoint to decrypt hidden text from video"""
    if 'video' not in request.files:
        return jsonify({"error": "Missing video file"}), 400
    
    video_file = request.files['video']
    
    if video_file.filename == '':
        return jsonify({"error": "No video selected"}), 400
    
    # Create temporary directory for processing
    session_id = str(uuid.uuid4())
    temp_dir = os.path.join(TEMP_FOLDER, session_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Save uploaded video
        video_path = os.path.join(temp_dir, secure_filename(video_file.filename))
        video_file.save(video_path)
        
        # First try to extract data from borders
        border_data = extract_border_data(video_path, temp_dir)
        
        # Then try to decode and decrypt hidden text
        decrypted_text = decode_video(video_path, temp_dir)
        
        response_data = {}
        
        if border_data:
            response_data["border_data"] = border_data
        
        if decrypted_text:
            response_data["stego_data"] = decrypted_text
        
        if response_data:
            return jsonify(response_data)
        else:
            return jsonify({"error": "No hidden text found in video"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Clean up temporary files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

if __name__ == '__main__':
    # Make sure keys are generated on startup
    generate_keys()
    
    # Try different ports if the default is in use
    port = 5001
    max_port_attempts = 10
    
    for attempt in range(max_port_attempts):
        try:
            print(f"Attempting to start server on port {port}")
            app.run(debug=True, host='0.0.0.0', port=port)
            break
        except OSError as e:
            if "Address already in use" in str(e) and attempt < max_port_attempts - 1:
                port += 1
                print(f"Port {port-1} is in use, trying port {port}")
            else:
                print(f"Could not start server: {e}")
                raise