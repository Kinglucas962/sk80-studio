// Reads the Windows master volume (0..1) and mute state through Core Audio (read only).
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }

public static class SkAudio {
  static IAudioEndpointVolume ep; static DateTime got = DateTime.MinValue;
  static IAudioEndpointVolume Ep() {
    if (ep == null || (DateTime.Now - got).TotalSeconds > 10) { // re-read the default device now and then
      var en = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
      IMMDevice dev; Marshal.ThrowExceptionForHR(en.GetDefaultAudioEndpoint(0, 1, out dev));
      var id = typeof(IAudioEndpointVolume).GUID; IAudioEndpointVolume v;
      Marshal.ThrowExceptionForHR(dev.Activate(ref id, 23, 0, out v)); ep = v; got = DateTime.Now;
    }
    return ep;
  }
  // "<0..100> <0|1>" or "" when there is no audio device
  public static string Read() {
    try { float v; bool m; var e = Ep(); e.GetMasterVolumeLevelScalar(out v); e.GetMute(out m); return ((int)Math.Round(v * 100)) + " " + (m ? 1 : 0); }
    catch { ep = null; return ""; }
  }
}
