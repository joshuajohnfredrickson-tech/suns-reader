import React from 'react';
import { getRelativeTime } from '../lib/utils';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  isWatched?: boolean;
}

interface VideoListProps {
  videos: Video[];
  showAddToTrusted?: boolean;
  onAddToTrusted?: (channelId: string, channelTitle: string) => void;
  trustedChannelIds?: Set<string>;
  onVideoClick: (video: Video) => void;
}

export function VideoList({
  videos,
  showAddToTrusted = false,
  onAddToTrusted,
  trustedChannelIds = new Set(),
  onVideoClick,
}: VideoListProps) {
  const handleAddToTrusted = (e: React.MouseEvent, video: Video) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToTrusted) {
      onAddToTrusted(video.channelId, video.channelTitle);
    }
  };

  return (
    <div>
      {videos.map((video, index) => {
        const isTrusted = trustedChannelIds.has(video.channelId);
        const isLast = index === videos.length - 1;
        const showAction = showAddToTrusted && !isTrusted && video.channelId;

        return (
          <div
            key={video.id}
            className={!isLast ? 'border-b border-zinc-200/50 dark:border-zinc-800/50' : ''}
          >
            <button
              type="button"
              onClick={() => onVideoClick(video)}
              className="block w-full px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors text-left"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="grid grid-cols-[20px_1fr] gap-2 pointer-events-none">
                {/* Dot column - centered vertically */}
                <div className="flex items-center justify-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      video.isWatched
                        ? 'bg-transparent border border-zinc-300 dark:border-zinc-600'
                        : 'bg-accent'
                    }`}
                  />
                </div>
                {/* Content column: thumbnail + text */}
                <div className="min-w-0 flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt=""
                    width={120}
                    height={68}
                    className="shrink-0 w-[120px] h-[68px] rounded object-cover bg-zinc-100 dark:bg-zinc-800"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <h3 className="text-base font-medium leading-snug text-foreground line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-baseline justify-between gap-2 mt-1.5 text-xs leading-tight text-zinc-500 dark:text-zinc-400">
                      <div className="min-w-0 flex-1 truncate">
                        <span>{video.channelTitle}</span>
                        <span className="mx-1.5">&middot;</span>
                        <span>{getRelativeTime(video.publishedAt)}</span>
                      </div>
                      {showAction && (
                        <button
                          onClick={(e) => handleAddToTrusted(e, video)}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="shrink-0 whitespace-nowrap pointer-events-auto px-2 py-1 -my-1 text-xs font-medium leading-tight text-accent hover:underline transition-colors"
                          style={{ touchAction: 'manipulation' }}
                        >
                          Add to Trusted
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
