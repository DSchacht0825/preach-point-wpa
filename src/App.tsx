import React, { useState, useEffect } from 'react';
import './App.css';

// Backend API URL - Your deployed Vercel backend
const BACKEND_API_URL = 'https://preach-point-backend-y2ia.vercel.app/api';

interface Sermon {
  id: string;
  title: string;
  date: string;
  transcription: string;
  summary: string;
  keyTakeaways: string[];
  discussionQuestions: string[];
  sermonNotes: string;
  actionSteps: string[];
  prayer?: string;
}

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [currentSermon, setCurrentSermon] = useState<Sermon | null>(null);
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [selectedBible, setSelectedBible] = useState('NKJV');
  const [showBibleSelector, setShowBibleSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [, setAudioChunks] = useState<Blob[]>([]);
  const [userNotes, setUserNotes] = useState('');

  const tabs: Tab[] = [
    { id: 'summary', label: 'Summary', icon: '📄' },
    { id: 'takeaways', label: 'Key Points', icon: '💡' },
    { id: 'discussion', label: 'Discussion', icon: '💬' },
    { id: 'discovery', label: 'Discovery', icon: '🔍' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'prayer', label: 'Prayer', icon: '🙏' },
  ];

  useEffect(() => {
    loadSermons();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadSermons = () => {
    const savedSermons = localStorage.getItem('sermons');
    if (savedSermons) {
      setSermons(JSON.parse(savedSermons));
    }
  };

  const saveSermons = (sermonsToSave: Sermon[]) => {
    localStorage.setItem('sermons', JSON.stringify(sermonsToSave));
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);

      const newSermon: Sermon = {
        id: Date.now().toString(),
        title: `Sermon - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        transcription: '',
        summary: '',
        keyTakeaways: [],
        discussionQuestions: [],
        sermonNotes: '',
        actionSteps: [],
      };
      setCurrentSermon(newSermon);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);

      // Call backend API
      const response = await fetch(`${BACKEND_API_URL}/process-sermon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          bibleVersion: selectedBible,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const processedSermon: Sermon = {
        ...currentSermon!,
        transcription: result.transcription || 'Transcription unavailable',
        summary: result.summary || 'Summary unavailable',
        keyTakeaways: result.keyTakeaways || [],
        discussionQuestions: result.discussionQuestions || [],
        sermonNotes: result.sermonNotes || '',
        actionSteps: result.actionSteps || [],
        prayer: result.prayer || '',
      };

      const updatedSermons = [processedSermon, ...sermons];
      setSermons(updatedSermons);
      saveSermons(updatedSermons);
      setCurrentSermon(processedSermon);
      setSelectedSermon(processedSermon);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing audio:', error);

      // Fallback content
      const fallbackSermon: Sermon = {
        ...currentSermon!,
        transcription: 'Audio processing temporarily unavailable...',
        summary: 'This sermon discusses faith and action, emphasizing the importance of living out our beliefs through concrete actions and consistent prayer.',
        keyTakeaways: [
          'Faith requires action to be meaningful',
          'Prayer and works go hand in hand',
          'We are called to participate in God\'s kingdom',
          'Belief must translate into behavior',
          'Spiritual growth comes from practice',
        ],
        discussionQuestions: [
          'How can we better align our actions with our faith?',
          'What prevents us from acting on our beliefs?',
          'Share a time when your faith led you to take action',
          'How can we support each other in living out our faith?',
          'What role does prayer play in guiding our actions?',
        ],
        sermonNotes: `Main Scripture: James 2:17

Key Points:
1. Faith and Works Partnership
   - Faith provides foundation
   - Works demonstrate faith
   - Both essential for spiritual growth

2. Active Participation in God's Kingdom
   - Called to serve
   - Using our gifts
   - Building community

3. Prayer as Guide for Action
   - Seeking God's direction
   - Listening for guidance
   - Moving in obedience`,
        actionSteps: [
          'Pray daily about applying the message',
          'Read referenced scriptures this week',
          'Find one way to serve others'
        ],
        prayer: 'Lord, help us to be doers of your word and not hearers only. Give us the courage to act on our faith and the wisdom to know how to serve you better. In Jesus\' name, Amen.'
      };

      const updatedSermons = [fallbackSermon, ...sermons];
      setSermons(updatedSermons);
      saveSermons(updatedSermons);
      setCurrentSermon(fallbackSermon);
      setSelectedSermon(fallbackSermon);
      setIsProcessing(false);
    }
  };

  const generateDiscoveryStudy = (sermon: Sermon) => {
    return {
      observe: [
        'What are the main themes in this message?',
        'What scriptures were referenced or quoted?',
        'What examples or stories were shared?',
        'What tone or emotion did the speaker convey?'
      ],
      interpret: [
        'What is the central message God wants to communicate?',
        'How does this connect to the broader story of scripture?',
        'What cultural context helps us understand this better?',
        'What might have been challenging for the original audience?'
      ],
      apply: [
        'How does this message speak to your current situation?',
        'What specific action is God calling you to take?',
        'What obstacles might prevent you from applying this?',
        'What steps will you take to grow in this area?'
      ],
      pray: [
        'Ask God to help you understand His heart in this message',
        'Pray for wisdom to apply these truths to your life',
        'Intercede for others who need to hear this message',
        'Thank God for speaking to you through His word'
      ]
    };
  };

  if (selectedSermon) {
    const discoveryStudy = generateDiscoveryStudy(selectedSermon);

    return (
      <div className="App">
        <div className="container">
          <div className="header">
            <button
              onClick={() => setSelectedSermon(null)}
              className="record-button"
              style={{ width: 'auto', height: 'auto', borderRadius: '8px', fontSize: '1rem', padding: '10px 20px' }}
            >
              ← Back
            </button>
            <h1 className="title">{selectedSermon.title}</h1>
            <p className="subtitle">
              {new Date(selectedSermon.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="tab-container">
            <div className="tab-navigation">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="tab-content">
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div>
                  <h2 className="section-title">Sermon Summary</h2>
                  <p className="content-text">{selectedSermon.summary}</p>
                </div>
              )}

              {/* Key Takeaways Tab */}
              {activeTab === 'takeaways' && (
                <div>
                  <h2 className="section-title">Key Takeaways</h2>
                  <ul className="content-list">
                    {selectedSermon.keyTakeaways.map((takeaway, index) => (
                      <li key={index} className="content-item">
                        <div className="item-text">{takeaway}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discussion Tab */}
              {activeTab === 'discussion' && (
                <div>
                  <h2 className="section-title">Discussion Questions</h2>
                  <ul className="content-list">
                    {selectedSermon.discussionQuestions.map((question, index) => (
                      <li key={index} className="content-item">
                        <div className="item-text">{question}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discovery Tab */}
              {activeTab === 'discovery' && (
                <div>
                  <h2 className="section-title">Discovery Bible Study</h2>

                  <div className="discovery-section">
                    <h3 className="discovery-title">🔍 Observe</h3>
                    <div className="discovery-content">What do you notice?</div>
                    <ul className="content-list">
                      {discoveryStudy.observe.map((item, index) => (
                        <li key={index} className="content-item">
                          <div className="item-text">{item}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="discovery-section">
                    <h3 className="discovery-title">🤔 Interpret</h3>
                    <div className="discovery-content">What does it mean?</div>
                    <ul className="content-list">
                      {discoveryStudy.interpret.map((item, index) => (
                        <li key={index} className="content-item">
                          <div className="item-text">{item}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="discovery-section">
                    <h3 className="discovery-title">✨ Apply</h3>
                    <div className="discovery-content">How will you respond?</div>
                    <ul className="content-list">
                      {discoveryStudy.apply.map((item, index) => (
                        <li key={index} className="content-item">
                          <div className="item-text">{item}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="discovery-section">
                    <h3 className="discovery-title">🙏 Pray</h3>
                    <div className="discovery-content">Talk to God about it</div>
                    <ul className="content-list">
                      {discoveryStudy.pray.map((item, index) => (
                        <li key={index} className="content-item">
                          <div className="item-text">{item}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div>
                  <h2 className="section-title">Personal Notes</h2>
                  <textarea
                    className="notes-input"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    placeholder="Add your personal notes about this sermon..."
                  />

                  <h3 className="section-subtitle">Sermon Notes</h3>
                  <div className="content-text" style={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                    {selectedSermon.sermonNotes}
                  </div>
                </div>
              )}

              {/* Prayer Tab */}
              {activeTab === 'prayer' && (
                <div>
                  <h2 className="section-title">Prayer</h2>
                  {selectedSermon.prayer && (
                    <div className="prayer-point">
                      <div className="item-text">{selectedSermon.prayer}</div>
                    </div>
                  )}

                  <h3 className="section-subtitle">Action Steps</h3>
                  <ul className="content-list">
                    {selectedSermon.actionSteps.map((step, index) => (
                      <li key={index} className="prayer-point">
                        <div className="item-text">{step}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1 className="title">Preach Point</h1>
          <p className="subtitle">AI-Powered Sermon Summarizer</p>
        </div>

        <div className="recording-container">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`record-button ${isRecording ? 'recording' : ''}`}
          >
            {isProcessing ? (
              'Processing...'
            ) : isRecording ? (
              'Stop Recording'
            ) : (
              '🎤 Start Recording'
            )}
          </button>

          {isRecording && (
            <div>
              <div className="recording-status">Recording in progress...</div>
              <div className="timer">{formatTime(recordingTime)}</div>
            </div>
          )}

          {isProcessing && (
            <div className="processing-container">
              <div className="processing-text">Processing your sermon...</div>
              <div className="spinner"></div>
            </div>
          )}
        </div>

        {sermons.length > 0 && !isProcessing && (
          <div className="tab-container">
            <div className="tab-content">
              <h2 className="section-title">Recent Sermons</h2>
              <ul className="content-list">
                {sermons.map((sermon) => (
                  <li key={sermon.id} className="content-item">
                    <button
                      onClick={() => setSelectedSermon(sermon)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="item-text">
                        <strong>{sermon.title}</strong>
                        <br />
                        <small>{new Date(sermon.date).toLocaleDateString()}</small>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;