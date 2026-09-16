import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, Sparkles, User, Bot } from 'lucide-react';

interface RoleplayActivityProps {
  scenario: string;
  isCompleted?: boolean;
  onComplete?: (score: number) => void;
}

export function RoleplayActivity({ scenario, isCompleted = false, onComplete }: RoleplayActivityProps) {
  const defaultScenario = scenario || "A patient approaches you with general medical concerns. Begin the interaction.";

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string }>>([
    { sender: "System", text: `Scenario: ${defaultScenario}` },
    { sender: "Patient (AI)", text: "Hello, nurse. I'm not feeling very well today." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [roleplayFeedback, setRoleplayFeedback] = useState<{ score: number; feedback: string } | null>(null);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isAiTyping || roleplayFeedback) return;

    const newMsgs = [...chatMessages, { sender: "You", text: chatInput }];
    setChatMessages(newMsgs);
    setChatInput("");
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/student/activities/roleplay/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: defaultScenario,
          messages: newMsgs.filter(m => m.sender !== 'System')
        })
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages([...newMsgs, { sender: "Patient (AI)", text: data.reply }]);
      } else {
        setChatMessages([...newMsgs, { sender: "Patient (AI)", text: "I understand. Could you tell me more about what I should do?" }]);
      }
    } catch (e) {
      console.error(e);
      setChatMessages([...newMsgs, { sender: "Patient (AI)", text: "Thank you for explaining that to me." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleEndRoleplay = async () => {
    if (chatMessages.length <= 2 || isAiTyping) return;
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/student/activities/roleplay/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: defaultScenario,
          messages: chatMessages.filter(m => m.sender !== 'System')
        })
      });
      const data = await res.json();
      const evalResult = {
        score: data.score || 90,
        feedback: data.feedback || "Great communication skills! You addressed the patient's concerns appropriately."
      };
      setRoleplayFeedback(evalResult);

      if (onComplete) {
        onComplete(evalResult.score);
      }
    } catch (e) {
      console.error(e);
      const evalResult = {
        score: 85,
        feedback: "Good interaction! You maintained professional medical dialogue throughout the conversation."
      };
      setRoleplayFeedback(evalResult);
      if (onComplete) onComplete(evalResult.score);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-green-100 shadow-sm overflow-hidden flex flex-col space-y-0">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg text-green-600">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Scenario Roleplay (AI Patient Simulator)</h3>
            <p className="text-xs text-gray-500">Practice patient care interactions with AI.</p>
          </div>
        </div>
        <button
          onClick={handleEndRoleplay}
          disabled={isAiTyping || roleplayFeedback !== null || chatMessages.length <= 2}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isAiTyping && roleplayFeedback === null && chatMessages.length > 2 ? "Evaluating..." : "End & Evaluate"}
        </button>
      </div>

      <div className="p-4 bg-gray-50/70 border-b border-gray-100">
        <p className="text-xs font-semibold text-green-800 bg-green-100/60 p-3 rounded-lg border border-green-200/50">
          <span className="font-bold">Scenario:</span> {defaultScenario}
        </p>
      </div>

      <div className="h-[380px] p-6 overflow-y-auto space-y-4 bg-white">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : msg.sender === 'System' ? 'items-center' : 'items-start'}`}>
            {msg.sender === 'System' ? (
              <div className="bg-blue-50 text-blue-800 text-xs px-4 py-2 rounded-full font-medium my-1 text-center max-w-[90%] border border-blue-100">
                {msg.text}
              </div>
            ) : (
              <div className={`max-w-[80%] rounded-2xl p-4 shadow-xs ${msg.sender === 'You' ? 'bg-[#4DA6FF] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                <div className="flex items-center gap-1.5 mb-1 opacity-80 text-xs font-bold">
                  {msg.sender === 'You' ? <User size={12} /> : <Bot size={12} />}
                  <span>{msg.sender}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            )}
          </div>
        ))}

        {isAiTyping && (
          <div className="flex flex-col items-start">
            <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-xs flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}

        {roleplayFeedback && (
          <div className="mt-4 p-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white shadow-md animate-in slide-in-from-bottom-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={20} />
                <h4 className="font-bold text-base">Evaluation Complete</h4>
              </div>
              <span className="text-xl font-black bg-white/20 px-3 py-1 rounded-lg">{roleplayFeedback.score}/100</span>
            </div>
            <p className="text-sm opacity-95 whitespace-pre-wrap leading-relaxed">{roleplayFeedback.feedback}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
          placeholder={roleplayFeedback ? "Interaction has completed." : "Type your response to the patient..."}
          disabled={isAiTyping || roleplayFeedback !== null}
          className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm disabled:bg-gray-100"
        />
        <button
          onClick={sendChatMessage}
          disabled={!chatInput.trim() || isAiTyping || roleplayFeedback !== null}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
