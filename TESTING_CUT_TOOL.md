# Testing Cut Tool - Diagnostic Steps

## Expected vs Actual

### What SHOULD happen:
1. Load a 121.26s audio file
2. Select section from 6.46s to 11.26s (4.80s)
3. Press Enter
4. See TWO clips:
   - Clip 1: 0-6.46s (6.46s duration)
   - Clip 2: 11.26-121.26s (110s duration, positioned at 6.46s)
5. Total timeline: 116.46s of audio

### What to check:
1. **Visual**: Do you see TWO clips after cutting?
2. **Position**: Is the second clip positioned right after the first?
3. **Waveform**: Do both clips show waveforms?
4. **Playback**: Does playback work correctly through both clips?

## Potential Issues

### Issue 1: Clips disappear entirely
- Possible cause: renderTracks() not finding the new clips
- Check: Console should show clip data

### Issue 2: Only one clip shows
- Possible cause: One clip has 0 duration or invalid data
- Check: Console logs for clip durations

### Issue 3: Both clips show but playback is wrong
- Possible cause: audioStart not being respected
- Check: Play and listen if audio skips correctly

## Debug Instructions

1. **Open browser console** (F12)
2. **Load an audio file**
3. **Activate cut tool** (Press C)
4. **Drag selection** across part of the clip
5. **Check console** for:
   ```
   📊 Original clip: startTime=X, audioStart=Y, duration=Z
   📊 Before clip: startTime=X, audioStart=Y, duration=A
   📊 After clip: startTime=B, audioStart=C, duration=D
   ```
6. **Press Enter**
7. **Report back**: 
   - What do you see visually?
   - What does the console show?
   - Can you play the audio?

## Next Steps Based on Results

If clips DISAPPEAR:
- Issue with renderTracks() or clip storage
- Need to check if trackData.clips array is correct

If clips SHOW but WRONG:
- Issue with audioStart/duration calculation
- Need to verify playback respects those values

If clips SHOW CORRECTLY but AUDIO WRONG:
- Issue with audio playback system
- Need to check if audioStart is used during playback
