const PATTERNS = {
  success: [
    [523.25, 0, 0.12],
    [659.25, 0.1, 0.15],
    [783.99, 0.22, 0.24],
  ],
  confirm: [
    [659.25, 0, 0.1],
    [783.99, 0.09, 0.18],
  ],
  alert: [
    [392, 0, 0.14],
    [329.63, 0.15, 0.2],
  ],
  report: [
    [440, 0, 0.1],
    [440, 0.14, 0.12],
    [349.23, 0.28, 0.2],
  ],
  message: [
    [880, 0, 0.06],
    [1046.5, 0.07, 0.1],
  ],
  offer: [
    [587.33, 0, 0.09],
    [739.99, 0.08, 0.14],
  ],
  meeting: [
    [523.25, 0, 0.09],
    [698.46, 0.09, 0.16],
  ],
  transaction: [
    [587.33, 0, 0.08],
    [783.99, 0.08, 0.1],
    [1046.5, 0.18, 0.18],
  ],
  listing: [
    [440, 0, 0.08],
    [587.33, 0.08, 0.12],
  ],
  review: [
    [783.99, 0, 0.08],
    [987.77, 0.09, 0.14],
  ],
  verification: [
    [523.25, 0, 0.1],
    [659.25, 0.1, 0.12],
    [880, 0.2, 0.2],
  ],
};

let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function scheduleNotes(context, notes) {
  const start = context.currentTime + 0.02;
  notes.forEach(([frequency, offset, duration]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + offset;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + duration + 0.02);
  });
}

function patternFor(type = '') {
  if (type === 'new_report' || type === 'report_updated') return PATTERNS.report;
  if (type.includes('rejected') || type.includes('removed') || type.includes('cancelled')) return PATTERNS.alert;
  if (
    type.includes('approved') ||
    type.includes('accepted') ||
    type.includes('completed') ||
    type === 'verification_approved'
  ) {
    return PATTERNS.success;
  }
  if (type === 'new_message') return PATTERNS.message;
  if (type === 'new_offer' || type === 'counteroffer') return PATTERNS.offer;
  if (type.startsWith('meeting')) return PATTERNS.meeting;
  if (type.startsWith('transaction')) return PATTERNS.transaction;
  if (type.startsWith('listing')) return PATTERNS.listing;
  if (type === 'new_review') return PATTERNS.review;
  if (type.startsWith('verification')) return PATTERNS.verification;
  return PATTERNS.confirm;
}

/** Browsers require a user gesture before audio may start. */
export function primeNotificationAudio() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
}

export function playNotificationSound(type) {
  const context = getAudioContext();
  if (!context) return;

  const notes = patternFor(type);
  const play = () => {
    try {
      scheduleNotes(context, notes);
    } catch {
      /* Audio is a progressive enhancement. */
    }
  };

  if (context.state === 'suspended') {
    context.resume().then(play).catch(() => {});
    return;
  }
  play();
}
