# Product Requirements Document: Collaborative Music Workspace

Connecting musicians and empowering their creativity.

## 1. Introduction

This document outlines the requirements for a collaborative music
workspace application. The application aims to provide musicians with
a platform to create, share, and refine musical ideas in real-time,
regardless of their physical location.


## 2. Goals

* Enable real-time musical collaboration between two users.

* Provide tools for sharing and developing musical ideas, including
    lyrics, chords, and audio recordings.

* Offer high-quality audio transmission for remote collaboration and
    songwriting sessions.

* Maintain a user-friendly and intuitive interface.

## 3. Target Audience

* Musicians (instrumentalists, vocalists, songwriters, composers).

* Music educators and students.

* Songwriting partners.

* Music producers

## 4. Features

### 4.1 Core Features

* **Peer-to-Peer Audio Connection:**

    * Establish and maintain low-latency audio connections with no noise
    reduction, compression, or other effects that are ineffective for
    music collaboration.
    
    * Support selection of audio input and output devices.
    
    * Provide individual gain control for monitoring and controlling outgoing
        and incoming signals.
    
* **Shared Scratch Pad:**

    * Real-time collaborative text editor.
    
    * Specific formatting options for chords and lyric lines.
        
* **Audio Recording & Sharing:**

    * Ability to record audio snippets locally.

    * Metronome with count-in options
    
    * Audio snippets are immediately shared with other participants
    
    * Playback controls for shared audio.
    
    * Visual representation of audio (e.g. waveform)

    * Simple arrangement of audio with lyrics

    * Shared BPM, measures per line, "tape rate" configuration


### 4.2 Future Enhancements (Out of Scope for Initial Release)

* Instrument tuner.

*   Advanced audio effects processing.

*   Integration with digital audio workstations (DAWs).

*   Video conferencing.

## 5. Technical Requirements

* **Platform:** Web-based application (cross-platform compatibility).

* **Technology Stack:** JavaScript, HTML, CSS, Web Audio API, WebRTC,
      IndexedDB.

* **Performance:** High quality audio recording and transmission is
    critical. Near immediate synchronization of song edits are
    essential.

* **Scalability:** The system should be able to handle two concurent
    users and sixteen simultaneous audio tracks.

* **Security:** Secure peer-to-peer connection and data transmission.

##6. User Interface (UI) and User Experience (UX) - Detailed MVP Design

The core goal is to facilitate real-time musical collaboration. The UI/UX should be simple, functional, and not get in the way of the creative process.

###6.1. Overall Layout:

*   **Split Screen:** The interface will be divided into two main areas:

    * **Shared Workspace:** The main area where the shared text
          editor, recorded audio snippets, metronome, and other
          collaborative tools are located.
    
    * **Local Control Panel:** A top bar that
          provides controls for audio settings, input/output
          selection, gain adjustment, and user-specific controls.
    
* **Clean Design:** The UI should avoid unnecessary visual
      clutter. Use clear icons and simple typography.

* **Responsive Design:** The layout should adapt to different screen
      sizes (desktop, tablets).

###6.2. Shared Workspace:

* **Real-time Text Editor:** A large, editable text area where users
    can write lyrics, chord progressions, and notes.
    
    * Real-time updates: When one user types, the changes should
        appear immediately on the other user's screen.
    
    *   Basic Formatting:
    
        *   Simple markup for chords (e.g., `[C]`, `[Am]`) to be displayed differently.
	
        *   Clear distinction between lyric lines and other notations.
	
*   **Audio Snippets:**

    * Audio snippets are displayed directly below or above the lyrics
        they correspond to.
    
    *   Each snippet will have:
    
        *   A waveform display for visual representation.
	
        *   The ability to be dragged and dropped for simple arrangement.
	
        *   Visual alignment of audio to beats and bars (grid-like).
	
*   **Metronome & Tempo:**

    *   A simple start/stop control for the metronome.
    
    *   Display for the current tempo (BPM).
    
    *   Input field to change BPM.
    
    *   Count-in option.
    
*   **Track Settings**

    *  Number of measures in a line
    
    *  "Tape speed"

###6.3. Local Control Panel:

*   **Audio Input/Output:**

    * Dropdown menus or radio buttons to select audio input and output
        devices.
    
    * Clear labels indicating the selected input and output devices.
    
* **Gain Controls:**

    * Individual sliders for adjusting the local input gain, the gain
        of audio being sent to the peer, and the gain of audio
        received from the peer.
    
* **Push to Talk:**

    When musician 1 starts playback, musician 2 can hear it.  Musician
    2 is muted unless they hold a button to talk.  This prevents
    musician 2 from transmitting their playing back to musician 1.
    Musician 1 would hear this with a significant delay which would
    make it difficult for musician 1 to play.  When muted, a musician
    can record.
    
* **Recording Controls:**

    * A prominent record button.
    
    * A visual indicator to show that recording is in progress.
    
    * The recording will be added to the "Audio Snippet Area".

###6.4. User Experience (UX) Principles:

* **Real-Time Feedback:** Provide visual cues for all actions, e.g.,
      when audio is playing, when recording is in progress, when a
      connection is made.

* **Intuitive Controls:** Make the controls easily accessible and
      understandable without requiring a tutorial.

* **Minimalist Approach:** Avoid unnecessary UI elements and
      animations. Focus on what’s essential for real-time
      collaboration.

* **Low Latency:** Strive for the lowest possible latency between
      actions and their effects.

* **Clear Communication:** Provide clear messaging for status updates,
      errors, and other important information.

###6.5. Workflow Example:

1.  **Setup:**

* Both users open the web application and a peer-to-peer connection is
    automatically established.
    
    * Both users select their audio input/output devices and adjust
        gain levels.

2.  **Songwriting:**

    * One user starts typing lyrics and chords in the shared text
        editor. The other user sees the changes in real-time.
    
    * One user sets the tempo

3.  **Recording & Sharing:**

    * One user starts recording.  The metronome clicks, and the other
    user can hear the metronome and what the first user is playing.
    
    * The recorded snippet appears as a waveform in the shared audio
        area.

    * Either user can now play back the recorded audio.

4.  **Refining:**

    * The users drag the audio snippets and arrange them to create a
       basic song structure.
    
    * The users work together to refine lyrics, timing, and tempo.

**In Summary:**

The MVP should prioritize providing a simple, efficient, and real-time
platform for musicians to collaborate. The UI/UX design will focus on
these key elements:

*   Real-time text editor with chord notation.

*   Simple audio recording and sharing with waveform display.

*   Local gain adjustment and audio device selection.

*   Metronome controls.

*   A clear "push to talk" feature.

This will allow musicians to start creating, sharing, and iterating on
ideas with minimal friction.

## 7. Release Criteria

* All core features implemented and tested.

* Stable and reliable audio connections.

* User-friendly interface with clear instructions.

* Basic error handling and informative messages.

## 8. Future Considerations

* Monetization strategy (e.g., subscription, premium features).

* Community features (e.g., public jam sessions, user profiles).

* Mobile application development.
