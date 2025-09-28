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
  const [selectedBible] = useState('NKJV');
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Use the best available audio format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav';
        }
      }

      console.log('Using audio format:', mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        console.log('Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000); // Record in 1-second chunks
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
      console.log('Starting audio processing...');
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);

      console.log('Base64 audio length:', base64Audio.length);
      console.log('Backend API URL:', BACKEND_API_URL);

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

      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Success response:', result);

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
      setIsProcessing(false);

      // Show real error to user instead of fake content
      alert(`Failed to process sermon: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`);
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