class MuteButton extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.muted = true;
        this.pushToTalk = false;
        this.playbackActive = false;
        this._previousPushToTalkState = false;

        this.shadowRoot.innerHTML = `
            <style>
            :host {
                display: inline-block;
            }
            .mute-container {
                display: flex;
                align-items: center;
            }
            .mute-button {
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                padding: 10px 15px;
                cursor: pointer;
                border-radius: 5px;
                margin-right: 10px;
                user-select: none; /* Prevent text selection on click */
            }
            .mute-button.muted {
                background-color: #ddd;
            }
            .mute-button.talking {
                background-color: lightgreen;
            }
           .mute-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .push-to-talk-switch {
                display: flex;
                align-items: center;
            }
            .push-to-talk-switch input[type="checkbox"] {
               opacity: 0;
               position: absolute;
               }
            .push-to-talk-switch label {
               cursor: pointer;
               padding: 5px;
            }
            .push-to-talk-switch label::before {
               content: '';
               display: inline-block;
               width: 20px;
               height: 10px;
               border: 2px solid #ccc;
               border-radius: 10px;
               background-color: #ccc;
               vertical-align: middle;
               margin-right: 5px;
            }
            .push-to-talk-switch input[type="checkbox"]:checked + label::before {
               background-color: lightgreen;
            }
           .push-to-talk-switch input[type="checkbox"]:checked + label::after {
                content: '';
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #fff;
                margin-left: 10px;
                position: relative;
                top: -2px;
           }
           .push-to-talk-switch input[type="checkbox"]:disabled + label {
                opacity: 0.5;
                cursor: not-allowed;
           }

            </style>
            <div class="mute-container">
                <div class="mute-button muted" tabindex="0">Mute</div>
                <div class="push-to-talk-switch">
                  <input type="checkbox" id="pushToTalkSwitch">
                  <label for="pushToTalkSwitch">Push to Talk</label>
                </div>
            </div>
        `;
	this.muteButton = this.shadowRoot.querySelector('.mute-button');
	this.pushToTalkSwitch = this.shadowRoot.querySelector('#pushToTalkSwitch');
        this.pushToTalkLabel = this.shadowRoot.querySelector('label[for="pushToTalkSwitch"]');
	this._attachEventListeners();
    }

  _attachEventListeners() {
    this.muteButton.addEventListener('click', this._handleMuteClick.bind(this));
    this.pushToTalkSwitch.addEventListener('change', this._handlePushToTalkChange.bind(this));
        this.muteButton.addEventListener('mousedown', this._handleMuteMouseDown.bind(this));
        this.muteButton.addEventListener('mouseup', this._handleMuteMouseUp.bind(this));
	// Handle keyboard accessibility.
	this.muteButton.addEventListener('keydown', (event) => {
	    if (event.code === 'Space' || event.code === 'Enter') {
		this._handleMuteClick();
	    }
	});
  }


    _handleMuteClick() {
        if (!this.playbackActive) {
            this.muted = !this.muted;
	    this._updateMuteButtonState();
            this.dispatchEvent(new CustomEvent('mutechange', { detail: this.muted }));
        }
    }

     _handleMuteMouseDown() {
      if (this.playbackActive && this.pushToTalk) {
          this.muted = false;
          this._updateMuteButtonState();
	  this.dispatchEvent(new CustomEvent('mutechange', { detail: this.muted }));
	  
      }
    }

    _handleMuteMouseUp() {
        if (this.playbackActive && this.pushToTalk) {
            this.muted = true;
            this._updateMuteButtonState();
	    this.dispatchEvent(new CustomEvent('mutechange', { detail: this.muted }));
       }
    }


    _handlePushToTalkChange() {
        this.pushToTalk = this.pushToTalkSwitch.checked;
	this.dispatchEvent(new CustomEvent('pushToTalkchange', {
	    detail: this.pushToTalk }));
    }

  _updateMuteButtonState() {
    this.muteButton.classList.toggle('muted', this.muted);
    this.muteButton.classList.toggle('talking', !this.muted && this.pushToTalk && this.playbackActive);
  }
    
    
  setPlaybackActive(active) {
    this.playbackActive = active;
    if (this.playbackActive) {
	this._previousPushToTalkState = this.pushToTalk;
	this.pushToTalk = true;
	this.pushToTalkSwitch.checked = true;
	this.pushToTalkSwitch.disabled = true;
    } else {
	this.pushToTalk = this._previousPushToTalkState;
	this.pushToTalkSwitch.checked = this.pushToTalk;
	this.pushToTalkSwitch.disabled = false;
    }
      this._updateMuteButtonState();
    }
}

customElements.define('mute-button', MuteButton);
