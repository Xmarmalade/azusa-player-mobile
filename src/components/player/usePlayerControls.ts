import TrackPlayer from 'react-native-track-player';
import { useStore } from 'zustand';

import { biliSuggest } from '@utils/Bilibili/BiliOperate';
import { useNoxSetting } from '@hooks/useSetting';
import noxPlayingList, { getCurrentTPQueue } from '@stores/playingList';
import biliavideo from '@utils/mediafetch/biliavideo';
import { randomChoice, regexMatchOperations } from '@utils/Utils';
import { NoxRepeatMode } from '@enums/RepeatMode';
import { songlistToTracklist } from '@utils/RNTPUtils';
import appStore from '@stores/appStore';
import ytbvideoFetch from '@utils/mediafetch/ytbvideo';

const { getState } = noxPlayingList;
const setAppStore = appStore.setState;
const regexResolveURLs: NoxUtils.RegexMatchOperations<NoxMedia.Song> = [
  [ytbvideoFetch.regexResolveURLMatch, ytbvideoFetch.suggest],
];
// 130,音乐综合 29,音乐现场 59,演奏 31,翻唱 193,MV 30,VOCALOID·UTAU 194,电音 28,原创音乐
const musicTids = [130, 29, 59, 31, 193, 30, 194, 28];

export default () => {
  const currentPlayingId = useNoxSetting(state => state.currentPlayingId);
  const findCurrentPlayIndex = () => {
    return getCurrentTPQueue().findIndex(val => val.id === currentPlayingId);
  };
  const fadeIntervalMs = useStore(appStore, state => state.fadeIntervalMs);

  const getBiliSuggest = async () => {
    const currentSong = (await TrackPlayer.getActiveTrack())?.song;
    if (!currentSong) throw new Error('[PlaySuggest] currenSong is not valid!');

    const fallback = async () => {
      if (!currentSong.bvid.startsWith('BV')) {
        throw new Error('not a bvid; bilisuggest fails');
      }
      const biliSuggested = (await biliSuggest(currentSong.bvid)).filter(val =>
        musicTids.includes(val.tid)
      );
      return (
        await biliavideo.regexFetch({
          reExtracted: [
            '',
            randomChoice(biliSuggested).aid,
            // HACK: sure sure regexpexecarray
          ] as unknown as RegExpExecArray,
        })
      )[0];
    };

    return regexMatchOperations({
      song: currentSong,
      regexOperations: regexResolveURLs,
      fallback,
      regexMatching: song => song.id,
    });
  };

  const skipToBiliSuggest = async (next = true) => {
    if (getState().playmode !== NoxRepeatMode.SUGGEST) {
      throw new Error('playmode is not bilisuggest.');
    }
    const suggestedSong = [await getBiliSuggest()];
    if (next) {
      await TrackPlayer.add(await songlistToTracklist(suggestedSong));
      return;
    }
    await TrackPlayer.add(await songlistToTracklist(suggestedSong), 0);
  };

  const prepareSkipToNext = async () => {
    if (
      (await TrackPlayer.getActiveTrackIndex()) ===
      (await TrackPlayer.getQueue()).length - 1
    ) {
      const currentTPQueue = getCurrentTPQueue();
      let nextIndex = findCurrentPlayIndex() + 1;
      if (nextIndex > currentTPQueue.length - 1) {
        nextIndex = 0;
      }
      try {
        await skipToBiliSuggest();
      } catch {
        // TODO: this will just grow infinitely. WTF was i thinking?
        await TrackPlayer.add(
          await songlistToTracklist([currentTPQueue[nextIndex]])
        );
      }
    }
  };

  const prepareSkipToPrevious = async () => {
    if ((await TrackPlayer.getActiveTrackIndex()) === 0) {
      const currentTPQueue = getCurrentTPQueue();
      let nextIndex = findCurrentPlayIndex() - 1;
      if (nextIndex < 0) {
        nextIndex = currentTPQueue.length - 1;
      }
      try {
        await skipToBiliSuggest(false);
      } catch {
        await TrackPlayer.add(
          await songlistToTracklist([currentTPQueue[nextIndex]]),
          0
        );
      }
    }
  };

  const performSkipToNext = () => {
    const preparePromise = prepareSkipToNext();
    const callback = () => preparePromise.then(() => TrackPlayer.skipToNext());
    TrackPlayer.setAnimatedVolume({
      volume: 0,
      duration: fadeIntervalMs,
      callback,
    });
    setAppStore({ animatedVolumeChangedCallback: callback });
  };

  const performSkipToPrevious = () => {
    const preparePromise = prepareSkipToPrevious();
    const callback = () =>
      preparePromise.then(() => TrackPlayer.skipToPrevious());
    TrackPlayer.setAnimatedVolume({
      volume: 0,
      duration: fadeIntervalMs,
      callback,
    });
    setAppStore({ animatedVolumeChangedCallback: callback });
  };

  return {
    performSkipToNext,
    performSkipToPrevious,
  };
};
