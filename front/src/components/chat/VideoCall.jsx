import React, { useEffect, useRef, useState } from 'react';
import socketService from '../../services/socketService';
import { FiPhone, FiPhoneOff, FiVideo, FiVideoOff, FiMic, FiMicOff } from 'react-icons/fi';

const VideoCall = ({ isVisible, onClose, selectedUser }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callerId, setCallerId] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const handleEndCall = () => {
    socketService.endCall();
    setIsInCall(false);
    setIsIncomingCall(false);
    setLocalStream(null);
    setRemoteStream(null);
    setCallerId(null);
    setIncomingOffer(null);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Set up socket callbacks
      socketService.setOnIncomingCall((fromUserId, sdp) => {
        setIsIncomingCall(true);
        setCallerId(fromUserId);
        setIncomingOffer(sdp);
      });

      socketService.setOnCallAccepted(() => {
        setIsInCall(true);
        setIsIncomingCall(false);
      });

      socketService.setOnCallEnded(() => {
        handleEndCall();
      });

      socketService.setOnRemoteStream((stream) => {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });
    }

    return () => {
      // Cleanup
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      socketService.setOnIncomingCall(null);
      socketService.setOnCallAccepted(null);
      socketService.setOnCallEnded(null);
      socketService.setOnRemoteStream(null);
    };
  }, [isVisible, localStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleStartCall = async () => {
    try {
      const stream = await socketService.startCall(selectedUser._id);
      setLocalStream(stream);
      socketService.setCurrentCallUserId(selectedUser._id);
      setIsInCall(true);
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call. Please check your camera and microphone permissions.');
    }
  };

  const handleAnswerCall = async () => {
    try {
      if (incomingOffer) {
        const stream = await socketService.answerCall(callerId, incomingOffer);
        setLocalStream(stream);
        socketService.setCurrentCallUserId(callerId);
        setIsInCall(true);
        setIsIncomingCall(false);
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      alert('Failed to answer call.');
    }
  };

  const handleDeclineCall = () => {
    setIsIncomingCall(false);
    setCallerId(null);
    setIncomingOffer(null);
    // Optionally emit decline, but backend doesn't have it
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isIncomingCall ? 'Incoming Call' : isInCall ? 'Video Call' : 'Start Call'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {isIncomingCall && (
          <div className="text-center mb-4">
            <p className="mb-4">Incoming call from {callerId}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleAnswerCall}
                className="bg-green-500 text-white px-4 py-2 rounded flex items-center"
              >
                <FiPhone className="mr-2" /> Answer
              </button>
              <button
                onClick={handleDeclineCall}
                className="bg-red-500 text-white px-4 py-2 rounded flex items-center"
              >
                <FiPhoneOff className="mr-2" /> Decline
              </button>
            </div>
          </div>
        )}

        {!isIncomingCall && !isInCall && (
          <div className="text-center mb-4">
            <p className="mb-4">Call {selectedUser?.name}</p>
            <button
              onClick={handleStartCall}
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
            >
              <FiPhone className="mr-2" /> Start Call
            </button>
          </div>
        )}

        {isInCall && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="mb-2">You</p>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-64 bg-gray-200 rounded"
              />
            </div>
            <div>
              <p className="mb-2">{selectedUser?.name || 'Remote'}</p>
              <video
                ref={remoteVideoRef}
                autoPlay
                className="w-full h-64 bg-gray-200 rounded"
              />
            </div>
          </div>
        )}

        {isInCall && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={toggleMute}
              className={`px-4 py-2 rounded flex items-center ${isMuted ? 'bg-red-500' : 'bg-gray-500'} text-white`}
            >
              {isMuted ? <FiMicOff /> : <FiMic />} {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`px-4 py-2 rounded flex items-center ${isVideoOff ? 'bg-red-500' : 'bg-gray-500'} text-white`}
            >
              {isVideoOff ? <FiVideoOff /> : <FiVideo />} {isVideoOff ? 'Video On' : 'Video Off'}
            </button>
            <button
              onClick={handleEndCall}
              className="bg-red-500 text-white px-4 py-2 rounded flex items-center"
            >
              <FiPhoneOff className="mr-2" /> End Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;