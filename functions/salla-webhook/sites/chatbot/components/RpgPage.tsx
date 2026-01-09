import React from 'react';
import { ChatWindow } from './ChatWindow';
import { RpgStatusCard } from './RpgStatusCard';
import { Character, Message, MessagePart, RpgState, WorldInfo } from '../types';

interface RpgPageProps {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onBackToChat: () => void;
  onEditSheet: () => void;
  onContinue: () => void;
  onProgressStory: () => void;
  onMakeImage: () => void;
  onMakeVideo: () => void;
  onCopyImagePrompt: () => void;
  onCopyFullMangaPrompt: () => void;
  onTogglePromptStyle: () => void;
  isGeneratingPrompt: boolean;
  promptStyle: 'anime' | 'light-novel';
  onTriggerGroupChat: () => Promise<void> | void;
  onSendMessage: (message: string, as: string) => Promise<void | Message> | void;
  onStopGeneration: () => void;
  onForceUnlock: (reason?: string) => void;
  onEditMessage: (id: string, newContent: string, part?: MessagePart) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerateMessage?: (id: string) => void;
  isSending: boolean;
  isContinuing: boolean;
  narrationMode: 'continue' | 'progress' | null;
  isGeneratingMedia: boolean;
  chatHistory: Message[];
  characters: Character[];
  activeParty: Character[];
  rpgState: RpgState | null;
  worldInfo: WorldInfo;
  onExitRpgView: () => void;
}

export const RpgPage: React.FC<RpgPageProps> = ({
  sidebarOpen,
  onOpenSidebar,
  onBackToChat,
  onEditSheet,
  onContinue,
  onProgressStory,
  onMakeImage,
  onMakeVideo,
  onCopyImagePrompt,
  onCopyFullMangaPrompt,
  onTogglePromptStyle,
  isGeneratingPrompt,
  promptStyle,
  onTriggerGroupChat,
  onSendMessage,
  onStopGeneration,
  onForceUnlock,
  onEditMessage,
  onDeleteMessage,
  onRegenerateMessage,
  isSending,
  isContinuing,
  narrationMode,
  isGeneratingMedia,
  chatHistory,
  characters,
  activeParty,
  rpgState,
  worldInfo,
  onExitRpgView,
}) => {
  const presentParty = activeParty.filter((c) => (c.presence ?? 'present') === 'present');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#04010c] text-gray-200">
      <div className={`flex-1 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex h-full w-full flex-col bg-[radial-gradient(circle_at_20%_20%,#1b1031_0%,transparent_35%),radial-gradient(circle_at_80%_0%,#0f1024_0%,transparent_40%),linear-gradient(140deg,#06030f_0%,#0a0718_45%,#05030b_100%)]">
          <header className="flex flex-wrap items-center justify-between border-b border-white/10 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenSidebar}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/10 md:hidden"
              >
                Party & setup
              </button>
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-primary">RPG view</p>
                <h1 className="text-xl font-semibold">{worldInfo.scenario || 'Untitled adventure'}</h1>
                <p className="text-xs text-white/60">
                  {worldInfo.currentLocation || 'Unknown location'} • {worldInfo.currentTime || 'Unknown time'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.25em]">
              <button
                onClick={onEditSheet}
                className="rounded-full border border-primary/40 px-4 py-2 text-primary transition hover:bg-primary/10"
              >
                Edit sheet
              </button>
              <button
                onClick={onBackToChat}
                className="rounded-full border border-white/20 px-4 py-2 text-white/80 transition hover:bg-white/10"
              >
                Back to chat
              </button>
            </div>
          </header>

          <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-hidden px-5 py-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/80">
                <button
                  onClick={onContinue}
                  disabled={isSending || isContinuing}
                  className="rounded-full border border-white/15 px-4 py-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Continue narration
                </button>
                <button
                  onClick={onProgressStory}
                  disabled={isSending || isContinuing}
                  className="rounded-full border border-primary/50 px-4 py-2 text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Advance plot
                </button>
                <button
                  onClick={onTriggerGroupChat}
                  disabled={isSending || isContinuing}
                  className="rounded-full border border-emerald-400/40 px-4 py-2 text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Party speaks
                </button>
                <button
                  onClick={onMakeImage}
                  disabled={isGeneratingMedia}
                  className="rounded-full border border-indigo-400/40 px-4 py-2 text-indigo-200 transition hover:bg-indigo-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Scene image
                </button>
                <button
                  onClick={onMakeVideo}
                  disabled={isGeneratingMedia}
                  className="rounded-full border border-fuchsia-400/40 px-4 py-2 text-fuchsia-200 transition hover:bg-fuchsia-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/40"
                >
                  Scene video
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <ChatWindow
                  chatHistory={chatHistory}
                  characters={characters}
                  onSendMessage={onSendMessage}
                  onContinue={onContinue}
                  onProgressStory={onProgressStory}
                  onStopGeneration={onStopGeneration}
                  onForceUnlock={onForceUnlock}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onRegenerateMessage={onRegenerateMessage}
                  onOpenSidebar={onOpenSidebar}
                  isSending={isSending}
                  isContinuing={isContinuing}
                  narrationMode={narrationMode}
                  onMakeImage={onMakeImage}
                  onMakeVideo={onMakeVideo}
                  onCopyImagePrompt={onCopyImagePrompt}
                  onCopyFullMangaPrompt={onCopyFullMangaPrompt}
                  onTogglePromptStyle={onTogglePromptStyle}
                  isGeneratingPrompt={isGeneratingPrompt}
                  promptStyle={promptStyle}
                  isGeneratingMedia={isGeneratingMedia}
                  activePartyIds={activeParty.map((c) => c.id)}
                  onTriggerGroupChat={onTriggerGroupChat}
                  rpgState={rpgState}
                  onOpenRpgSheet={onEditSheet}
                  onExitRpgView={onExitRpgView}
                  isInRpgView
                  showEmbeddedRpgCard={false}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4">
              {rpgState && (
                <RpgStatusCard
                  state={rpgState}
                  onEdit={onEditSheet}
                  onNarrate={onContinue}
                  onResume={() => {}}
                  isNarrating={narrationMode === 'progress' || narrationMode === 'continue'}
                />
              )}

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.3)]">
                <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/50">Scene facts</p>
                <div className="mt-2 space-y-2 text-sm text-white/80">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">Location</p>
                    <p className="text-base text-white">{worldInfo.currentLocation || 'Unknown'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">Time</p>
                    <p className="text-base text-white">{worldInfo.currentTime || 'Unspecified'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/40">Tracker</p>
                    <p className="whitespace-pre-wrap text-sm text-white/80">{worldInfo.storyTracker || 'Add a story tracker in the sidebar.'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.3)]">
                <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/50">Party presence</p>
                {presentParty.length ? (
                  <div className="mt-3 space-y-2">
                    {presentParty.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{member.name}</p>
                          {member.location && <p className="text-[0.7rem] text-white/60">{member.location}</p>}
                        </div>
                        <span className="text-[0.7rem] uppercase tracking-[0.25em] text-emerald-200">Present</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/60">No one present. Bring characters into the scene via sidebar.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
