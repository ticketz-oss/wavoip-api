var N = Object.defineProperty;
var S = (r, a, t) => a in r ? N(r, a, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[a] = t;
var l = (r, a, t) => S(r, typeof a != "symbol" ? a + "" : a, t);
import Z from "axios";
import { io as T } from "socket.io-client";
class h {
  constructor() {
    l(this, "listeners", /* @__PURE__ */ new Map());
  }
  emit(a, ...t) {
    const e = this.listeners.get(a) || [];
    for (const s of e)
      s(...t);
  }
  on(a, t) {
    const e = this.listeners.get(a) || [];
    return e.push(t), this.listeners.set(a, e), () => this.off(a, t);
  }
  off(a, t) {
    const e = this.listeners.get(a);
    e && this.listeners.set(
      a,
      e.filter((s) => s !== t)
    );
  }
  removeAllListeners(a) {
    return this.listeners.delete(a);
  }
}
class _ extends h {
  constructor(t) {
    super();
    l(this, "pc", null);
    l(this, "audioContext");
    l(this, "audioAnalyserDeffer", {});
    l(this, "muteInterval", null);
    l(this, "statsInterval", null);
    l(this, "answer", null);
    l(this, "peerMuted", !1);
    l(this, "audioAnalyser");
    l(this, "status", "connecting");
    l(this, "stats");
    this.microphone = t, this.audioContext = new AudioContext({ sampleRate: 48e3, latencyHint: 0 }), this.audioContext.suspend(), this.audioAnalyser = new Promise((e) => {
      this.audioAnalyserDeffer = { resolve: e };
    }), this.stats = {
      rtt: {
        avg: 0,
        max: 0,
        min: 0
      },
      rx: {
        loss: 0,
        total: 0,
        total_bytes: 0
      },
      tx: {
        loss: 0,
        total: 0,
        total_bytes: 0
      }
    };
  }
  async start(t) {
    const { device: e } = await this.microphone.start();
    if (!(e != null && e.stream)) return;
    const s = e.stream;
    this.audioContext.state === "suspended" && await this.audioContext.resume(), this.pc = new RTCPeerConnection();
    for (const i of s.getTracks())
      i.enabled = !0, this.pc.addTrack(i, s);
    this.pc.ontrack = (i) => {
      var u, d;
      const n = i.streams[0], o = this.audioContext.createMediaStreamSource(n), c = this.audioContext.createAnalyser();
      c.fftSize = 256, o.connect(c), c.connect(this.audioContext.destination), (d = (u = this.audioAnalyserDeffer).resolve) == null || d.call(u, c), this.getStats(this.pc), this.muteInterval = setInterval(() => this.checkForMute(c), 1e3), this.statsInterval = setInterval(
        () => this.getStats(this.pc),
        5e3
      );
    }, this.pc.onconnectionstatechange = () => {
      var i, n, o, c, u;
      ((i = this.pc) == null ? void 0 : i.connectionState) === "connecting" && this.setStatus("connecting"), (((n = this.pc) == null ? void 0 : n.connectionState) === "disconnected" || ((o = this.pc) == null ? void 0 : o.connectionState) === "closed") && this.setStatus("disconnected"), ((c = this.pc) == null ? void 0 : c.connectionState) === "closed" && this.audioContext.suspend(), ((u = this.pc) == null ? void 0 : u.connectionState) === "connected" && this.setStatus("connected");
    }, await this.pc.setRemoteDescription(t), this.answer = await this.pc.createAnswer(), await this.pc.setLocalDescription(this.answer);
  }
  async stop() {
    this.pc && (this.pc.close(), this.pc = null), this.audioContext.state === "running" && await this.audioContext.suspend(), this.microphone.stop(), this.audioAnalyser = new Promise((t) => {
      this.audioAnalyserDeffer = { resolve: t };
    }), this.muteInterval && clearInterval(this.muteInterval), this.statsInterval && clearInterval(this.statsInterval);
  }
  setStatus(t) {
    this.status = t, this.emit("status", t);
  }
  checkForMute(t) {
    const e = new Uint8Array(t.fftSize);
    t.getByteTimeDomainData(e);
    const s = e.reduce((i, n) => i + Math.abs(n - 128), 0) / e.length;
    s < 0.05 && !this.peerMuted && (this.peerMuted = !0, this.emit("muted", this.peerMuted)), s >= 0.05 && this.peerMuted && (this.peerMuted = !1, this.emit("muted", this.peerMuted));
  }
  async getStats(t) {
    const e = await t.getStats();
    for (const s of e.values()) {
      if (s.type === "inbound-rtp" && s.kind === "audio") {
        const i = s;
        i.bytesReceived && (this.stats.rx.total_bytes += i.bytesReceived), i.packetsLost && (this.stats.rx.loss = i.packetsLost), i.packetsReceived && (this.stats.rx.total = i.packetsReceived);
      }
      s.type === "outbound-rtp" && s.kind === "audio" && s.bytesSent && this.stats.tx.total_bytes, s.type === "remote-inbound-rtp" && s.kind === "audio" && (s.packetsLost && (this.stats.tx.loss = s.packetsLost), s.packetsReceived && (this.stats.tx.total = s.packetsReceived), s.roundTripTime && s.roundTripTimeMeasurements && (this.stats.rtt.avg += (s.roundTripTime - this.stats.rtt.avg) / s.roundTripTimeMeasurements, (this.stats.rtt.min === 0 || this.stats.rtt.min > s.roundTripTime) && (this.stats.rtt.min = s.roundTripTime), this.stats.rtt.max < s.roundTripTime && (this.stats.rtt.max = s.roundTripTime)));
    }
    this.emit("stats", this.stats);
  }
}
function E(r, a, t, e) {
  const { callbacks: s, ...i } = r;
  return r.callbacks.onEnd = () => {
    e.stop();
  }, e instanceof _ && (e.on("stats", (n) => {
    var o, c;
    return (c = (o = r.callbacks).onStats) == null ? void 0 : c.call(o, n);
  }), e.answer && (a.sendSdpAnswer(e.answer), e.on("muted", (n) => {
    var o, c, u, d;
    n ? (c = (o = r.callbacks).onPeerMute) == null || c.call(o) : (d = (u = r.callbacks).onPeerUnmute) == null || d.call(u);
  }))), {
    ...i,
    connection_status: e.status,
    audio_analyser: e.audioAnalyser,
    async end() {
      var o, c;
      const { err: n } = await a.endCall();
      return n || ((c = (o = r.callbacks).onEnd) == null || c.call(o), e.removeAllListeners("status")), { err: n };
    },
    async mute() {
      const { err: n } = await a.mute();
      if (n) return { err: n };
      r.muted = !0;
      const o = t.microphone.deviceUsed;
      if (o != null && o.stream)
        for (const c of o.stream.getTracks())
          c.enabled = !1;
      return { err: null };
    },
    async unmute() {
      const { err: n } = await a.unMute();
      if (n) return { err: n };
      r.muted = !1;
      const o = t.microphone.deviceUsed;
      if (o != null && o.stream)
        for (const c of o.stream.getTracks())
          c.enabled = !0;
      return { err: null };
    },
    onError(n) {
      r.callbacks.onError = n;
    },
    onPeerMute(n) {
      r.callbacks.onPeerMute = n;
    },
    onPeerUnmute(n) {
      r.callbacks.onPeerUnmute = n;
    },
    onEnd(n) {
      r.callbacks.onEnd = () => {
        e.stop(), n();
      };
    },
    onStats(n) {
      r.callbacks.onStats = n;
    },
    onConnectionStatus(n) {
      e.removeAllListeners("status"), e.on("status", (...o) => {
        n(...o);
      }), n(e.status);
    },
    onStatus(n) {
      r.callbacks.onStatus = n;
    }
  };
}
function M(r, a, t) {
  const { callbacks: e, ...s } = r;
  return {
    ...s,
    async accept() {
      const { err: i } = await t.canCall();
      if (i)
        return { call: null, err: i.toString() };
      const { transport: n, err: o } = await a.acceptCall({ call_id: r.id });
      if (!n)
        return { call: null, err: o };
      const c = await t.startTransport(a.token, n).catch(() => null);
      return c ? { call: E(r, a, t, c), err: null } : (await a.endCall(), { call: null, err: "TransportError" });
    },
    async reject() {
      var n, o, c, u;
      const { err: i } = await a.rejectCall(r.id);
      return i || ((o = (n = r.callbacks).onReject) == null || o.call(n), (u = (c = r.callbacks).onEnd) == null || u.call(c)), { err: i };
    },
    onAcceptedElsewhere(i) {
      r.callbacks.onAcceptedElsewhere = i;
    },
    onRejectedElsewhere(i) {
      r.callbacks.onRejectedElsewhere = i;
    },
    onUnanswered(i) {
      r.callbacks.onUnanswered = i;
    },
    onEnd(i) {
      r.callbacks.onEnd = i;
    },
    onStatus(i) {
      r.callbacks.onStatus = i;
    }
  };
}
function R(r, a, t, e) {
  const { callbacks: s, ...i } = r;
  function n() {
    return E(r, a, t, e);
  }
  function o() {
    e.stop();
  }
  return r.callbacks.onAccept = n, r.callbacks.onEnd = o, {
    ...i,
    async end() {
      var u, d;
      const { err: c } = await a.endCall();
      return c || (d = (u = r.callbacks).onEnd) == null || d.call(u), { err: c };
    },
    async mute() {
      const { err: c } = await a.mute();
      if (c) return { err: c };
      r.muted = !0;
      const u = t.microphone.deviceUsed;
      if (u != null && u.stream)
        for (const d of u.stream.getTracks())
          d.enabled = !1;
      return { err: null };
    },
    async unmute() {
      const { err: c } = await a.unMute();
      if (c) return { err: c };
      r.muted = !1;
      const u = t.microphone.deviceUsed;
      if (u != null && u.stream)
        for (const d of u.stream.getTracks())
          d.enabled = !0;
      return { err: null };
    },
    onStatus(c) {
      r.callbacks.onStatus = c;
    },
    onPeerAccept(c) {
      r.callbacks.onAccept = () => c(n());
    },
    onPeerReject(c) {
      r.callbacks.onReject = c;
    },
    onUnanswered(c) {
      r.callbacks.onUnanswered = c;
    },
    onEnd(c) {
      r.callbacks.onEnd = () => {
        o(), c();
      };
    }
  };
}
class W {
  constructor(a) {
    l(this, "calls");
    this.multimedia = a, this.calls = /* @__PURE__ */ new Map();
  }
  buildOffer(a, t) {
    const e = {
      id: a.id,
      type: a.type,
      device_token: t.token,
      direction: "INCOMING",
      status: "RINGING",
      muted: !1,
      peer: {
        ...a.peer,
        muted: !1
      },
      callbacks: {}
    };
    return this.calls.set(e.id, e), M(e, t, this.multimedia);
  }
  async buildOutgoing(a, t) {
    const e = await this.multimedia.startTransport(t.token, a.transport), s = {
      id: a.id,
      type: a.type,
      device_token: t.token,
      peer: {
        ...a.peer,
        muted: !1
      },
      direction: "OUTGOING",
      status: "RINGING",
      muted: !1,
      callbacks: {}
    };
    return this.calls.set(s.id, s), R(s, t, this.multimedia, e);
  }
  bindDeviceEvents(a) {
    a.socket.on("call:status", (t, e) => {
      var i, n, o, c, u, d, m, p, f, k, b, y, v, w;
      const s = this.calls.get(t);
      s && (s.status = e, (n = (i = s.callbacks).onStatus) == null || n.call(i, e), e === "ACTIVE" && ((c = (o = s.callbacks).onAccept) == null || c.call(o)), e === "NOT_ANSWERED" && ((d = (u = s.callbacks).onUnanswered) == null || d.call(u), (p = (m = s.callbacks).onEnd) == null || p.call(m), this.calls.delete(s.id)), e === "REJECTED" && ((k = (f = s.callbacks).onReject) == null || k.call(f), (y = (b = s.callbacks).onEnd) == null || y.call(b), this.calls.delete(s.id)), e === "ENDED" && ((w = (v = s.callbacks).onEnd) == null || w.call(v), this.calls.delete(s.id)));
    }), a.socket.on("peer:mute", (t, e) => {
      var i, n, o, c;
      const s = this.calls.get(t);
      s && (s.peer.muted = e, e ? (n = (i = s.callbacks).onPeerMute) == null || n.call(i) : (c = (o = s.callbacks).onPeerUnmute) == null || c.call(o));
    }), a.socket.on("peer:accepted_elsewhere", (t) => {
      var s, i, n, o;
      const e = this.calls.get(t);
      e && ((i = (s = e.callbacks).onAcceptedElsewhere) == null || i.call(s), (o = (n = e.callbacks).onEnd) == null || o.call(n), this.calls.delete(t));
    }), a.socket.on("peer:rejected_elsewhere", (t) => {
      var s, i, n, o;
      const e = this.calls.get(t);
      e && ((i = (s = e.callbacks).onAcceptedElsewhere) == null || i.call(s), (o = (n = e.callbacks).onEnd) == null || o.call(n), this.calls.delete(t));
    }), a.socket.on("call:stats", (t, e) => {
      var n, o;
      const s = this.calls.get(t);
      if (!s)
        return;
      const i = {
        rtt: {
          avg: e.rtt.client.avg + e.rtt.whatsapp.avg,
          min: e.rtt.client.min + e.rtt.whatsapp.min,
          max: e.rtt.client.max + e.rtt.whatsapp.max
        },
        rx: e.rx,
        tx: e.tx
      };
      (o = (n = s.callbacks).onStats) == null || o.call(n, i);
    }), a.socket.on("call:error", (t, e) => {
      var i, n, o, c;
      const s = this.calls.get(t);
      s && (s.status = "FAILED", (n = (i = s.callbacks).onError) == null || n.call(i, e), (c = (o = s.callbacks).onEnd) == null || c.call(o), this.calls.delete(s.id));
    }), a.socket.on("disconnect", () => {
      var t, e, s, i;
      if (a.socket.active)
        for (const n of this.calls.values())
          (e = (t = n.callbacks).onStatus) == null || e.call(t, "DISCONNECTED"), (i = (s = n.callbacks).onEnd) == null || i.call(s), this.calls.delete(n.id);
    });
  }
}
function g(r, a) {
  return {
    token: r.token,
    status: r.status,
    qrcode: r.qrcode,
    contact: r.contact,
    onStatus: (t) => {
      r.removeAllListeners("status"), r.on("status", t);
    },
    onQRCode: (t) => {
      r.removeAllListeners("qrcode"), r.on("qrcode", t);
    },
    onContact: (t) => {
      r.removeAllListeners("contact"), r.on("contact", t);
    },
    wakeUp: () => r.getInfos(),
    restart: () => r.restart(),
    logout: () => r.logout(),
    pairingCode: (...t) => r.requestPairingCode(...t),
    delete: () => a.removeDevices([r.token])
  };
}
class C extends h {
  constructor(t) {
    super();
    l(this, "socket");
    l(this, "token");
    l(this, "qrcode", null);
    l(this, "status", "disconnected");
    l(this, "contact", { official: null, unofficial: null });
    l(this, "api");
    this.token = t, this.api = Z.create({ baseURL: `https://devices.wavoip.com/${this.token}` }), this.socket = T("https://devices.wavoip.com", {
      transports: ["websocket"],
      path: `/${t}/websocket`,
      autoConnect: !1,
      auth: { version: "official" }
    }), this.socket.on("device:qrcode", (e) => {
      this.qrcode = e, this.emit("qrcode", e);
    }), this.socket.on("device:status", (e) => {
      this.status = e, this.emit("status", e);
    }), this.socket.on("device:contact", (e, s) => {
      this.contact[e] = s, this.emit("contact", e, s);
    }), this.socket.on("disconnect", () => {
      this.socket.active || (this.status = "disconnected", this.emit("status", this.status), this.getInfos().then((e) => {
        e && (this.status = e.status, this.emit("status", this.status));
      }));
    }), this.tryToConnect().then((e) => {
      if (!e) {
        this.status = "error", this.emit("status", this.status);
        return;
      }
      this.status = e.status, this.emit("status", this.status), this.socket.connect();
    });
  }
  canCall() {
    return this.status ? this.status === "error" ? { err: "Erro no dispositivo" } : this.status === "connecting" ? { err: "É preciso vincular um número ao dispositivo" } : this.status === "restarting" ? { err: "Dispositivo está sendo reiniciado" } : { err: null } : { err: "Dispositivo não está pronto para ligar" };
  }
  startCall(t) {
    return new Promise((e) => {
      this.socket.emit("call:start", t, (s) => {
        if (s.type === "error")
          return e({ call: null, err: s.result });
        e({
          call: {
            id: s.result.id,
            peer: s.result.peer,
            transport: s.result.transport
          },
          err: null
        });
      });
    });
  }
  endCall() {
    return new Promise((t) => {
      this.socket.emit("call:end", (e) => {
        e.type === "success" ? t({ err: null }) : t({ err: e.result });
      });
    });
  }
  acceptCall(t) {
    return new Promise((e) => {
      this.socket.emit("call:accept", { id: t.call_id }, (s) => {
        if (s.type === "error") {
          e({ transport: null, err: s.result });
          return;
        }
        e({ transport: s.result, err: null });
      });
    });
  }
  sendSdpAnswer(t) {
    this.socket.emit("call:sdp-answer", t);
  }
  rejectCall(t) {
    return new Promise((e) => {
      this.socket.emit("call:reject", t, (s) => {
        s.type === "success" ? e({ err: null }) : e({ err: s.result });
      });
    });
  }
  mute() {
    return new Promise((t) => {
      this.socket.emit("call:mute", (e) => {
        e.type === "success" ? t({ err: null }) : t({ err: e.result });
      });
    });
  }
  unMute() {
    return new Promise((t) => {
      this.socket.emit("call:unmute", (e) => {
        e.type === "success" ? t({ err: null }) : t({ err: e.result });
      });
    });
  }
  requestPairingCode(t) {
    return new Promise((e) => {
      this.socket.emit("whatsapp:pairing_code", t, (s) => {
        if (s.type === "error")
          return e({ pairingCode: null, err: s.result });
        e({ pairingCode: s.result, err: null });
      });
    });
  }
  async getInfos() {
    return this.api.get("/whatsapp/all_info").then((t) => t.data.result).catch(() => null);
  }
  async restart() {
    return this.api.get("/device/restart").then((t) => t.data.result).catch(() => null);
  }
  async logout() {
    return this.api.get("/whatsapp/logout").then((t) => t.data.result).catch(() => null);
  }
  async tryToConnect() {
    let t = null;
    for (; t = await this.api.get("/whatsapp/all_info").then((e) => e.data.result).catch(() => null), !t; )
      await new Promise((e) => setTimeout(() => e(), 3e3));
    return t;
  }
}
class x {
  constructor(a, t) {
    this.source = a, this.exception = t;
  }
  toString() {
    return this.source === "audio" && this.exception.name === "NotAllowedError" ? "Permissão do alto falante foi negada" : this.exception.name === "NotAllowedError" ? "Permissão do microfone foi negada" : this.exception.name === "OverconstrainedError" ? "Microfone não suporta os requisitos de áudio" : this.exception.name === "SecurityError" ? "Não é possível acessar o microfone, a página é insegura" : this.exception.name === "NotReadableError" ? "Não foi possível acessar o microfone" : this.exception.name === "NotFoundError" ? "Nenhum microfone encontrado" : this.exception.name === "AbortError" ? "O hardware do microfone não pode ser inicializado" : "Algo falhou";
  }
}
class G extends h {
  constructor() {
    super();
    l(this, "deviceUsed", null);
    l(this, "devices", []);
    navigator.mediaDevices.addEventListener("devicechange", () => this.updateDeviceList()), this.updateDeviceList();
  }
  async requestMicPermission() {
    return navigator.mediaDevices.getUserMedia({ audio: !0 });
  }
  async updateDeviceList() {
    const t = await navigator.mediaDevices.enumerateDevices().then(
      (e) => e.filter((s) => s.kind === "audioinput").map((s) => ({
        type: "audio-in",
        label: s.label || "Unnamed Microphone",
        deviceId: s.deviceId
      }))
    );
    return this.devices = t, this.emit("devices", this.devices), t;
  }
  async start() {
    var t;
    return this.devices.length ? this.selectDevice((t = this.deviceUsed) == null ? void 0 : t.deviceId) : { device: null, err: new x("microphone", new DOMException("", "NotFoundError")) };
  }
  async selectDevice(t) {
    const { stream: e, err: s } = await navigator.mediaDevices.getUserMedia({ audio: !0 }).then((n) => ({ stream: n, err: null })).catch((n) => ({ stream: null, err: n }));
    if (!e) return { device: null, err: new x("microphone", s) };
    const i = this.devices.find((n) => n.deviceId === t);
    return this.deviceUsed = { ...i, stream: e }, { device: this.deviceUsed, err: null };
  }
  stop() {
    var t;
    if ((t = this.deviceUsed) != null && t.stream) {
      for (const e of this.deviceUsed.stream.getTracks())
        e.stop();
      this.deviceUsed.stream = void 0;
    }
  }
}
class D extends h {
  constructor() {
    super();
    l(this, "deviceUsed", null);
    l(this, "devices", []);
    navigator.mediaDevices.addEventListener("devicechange", () => this.updateDeviceList()), this.updateDeviceList();
  }
  async updateDeviceList() {
    const t = await navigator.mediaDevices.enumerateDevices().then(
      (e) => e.filter((s) => s.kind === "audiooutput").map((s) => ({
        type: "audio-out",
        label: s.label || "Unnamed Speaker",
        deviceId: s.deviceId
      }))
    );
    return this.devices = t, this.emit("devices", this.devices), t;
  }
  // async start() {
  //     const { stream, err } = await navigator.mediaDevices
  //         .getUserMedia({ audio: true })
  //         .then((stream) => ({ stream, err: null }))
  //         .catch((err: DOMException) => ({ stream: null, err }));
  //
  //     if (!stream) return { device: null, err: new MultimediaError("audio", err) };
  //
  //     const device = this.devices.find((device) => device.deviceId === "") as MultimediaDevice;
  //
  //     this.deviceUsed = { ...device, stream };
  //
  //     return { device: this.deviceUsed, err: null };
  // }
}
class I extends h {
  constructor(t) {
    super();
    l(this, "source");
    l(this, "resample_node");
    l(this, "ready");
    this.audio_context = t, this.source = null, this.resample_node = null, this.ready = new Promise((e) => {
      this.audio_context.audioWorklet.addModule(
        "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js"
      ).then(
        () => this.audio_context.audioWorklet.addModule(new URL("data:text/javascript;base64,KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2NsYXNzIGEgZXh0ZW5kcyBBdWRpb1dvcmtsZXRQcm9jZXNzb3J7c3JjPW51bGw7YWNjdW11bGF0ZWRfUENNPVtdO2NvbnN0cnVjdG9yKGUpe3N1cGVyKGUpO2NvbnN0IG49MSxzPWUucHJvY2Vzc29yT3B0aW9ucz8uc2FtcGxlUmF0ZXx8NDhlMyx0PTE2ZTMse2NyZWF0ZTpjLENvbnZlcnRlclR5cGU6cn09Z2xvYmFsVGhpcy5MaWJTYW1wbGVSYXRlO2MobixzLHQse2NvbnZlcnRlclR5cGU6ci5TUkNfU0lOQ19CRVNUX1FVQUxJVFl9KS50aGVuKGw9Pnt0aGlzLnNyYz1sfSl9cHJvY2VzcyhlLG4scyl7aWYoIWUubGVuZ3RofHwhZVswXS5sZW5ndGh8fCFlWzBdWzBdKXJldHVybiEwO2ZvcihsZXQgdD0wO3Q8ZS5sZW5ndGg7dCsrKXtjb25zdCBjPWVbdF07Zm9yKGxldCByPTA7cjxjLmxlbmd0aDtyKyspe2NvbnN0IGw9Y1tyXTtmb3IobGV0IG89MDtvPGwubGVuZ3RoO28rKyluW3RdW3JdW29dPWxbb119fWlmKHRoaXMuc3JjIT09bnVsbCl7Y29uc3QgdD10aGlzLnNyYy5mdWxsKGVbMF1bMF0sbnVsbCxudWxsKSxjPXRoaXMuY29udmVydFRvUENNKHQpO2Zvcih0aGlzLmFjY3VtdWxhdGVkX1BDTS5wdXNoKC4uLmMpO3RoaXMuYWNjdW11bGF0ZWRfUENNLmxlbmd0aD49MzIwOyl7Y29uc3Qgcj10aGlzLmFjY3VtdWxhdGVkX1BDTS5zcGxpY2UoMCwzMjApO3RoaXMucG9ydC5wb3N0TWVzc2FnZShuZXcgSW50MTZBcnJheShyKS5idWZmZXIpfX1yZXR1cm4hMH1jb252ZXJ0VG9QQ00oZSl7Y29uc3Qgbj1uZXcgSW50MTZBcnJheShlLmxlbmd0aCk7Zm9yKGxldCBzPTA7czxlLmxlbmd0aDtzKyspbltzXT1NYXRoLm1heCgtMzI3NjgsTWF0aC5taW4oMzI3NjcsTWF0aC5mbG9vcihlW3NdKjMyNzY3KSkpO3JldHVybiBufX1yZWdpc3RlclByb2Nlc3NvcigicmVzYW1wbGUtcHJvY2Vzc29yIixhKX0pKCk7Cg==", import.meta.url)).then(() => {
          e();
        })
      );
    });
  }
  async start(t) {
    this.audio_context.state !== "running" && await this.audio_context.resume(), this.resample_node = new AudioWorkletNode(this.audio_context, "resample-processor", {
      processorOptions: { sampleRate: this.audio_context.sampleRate }
    }), this.resample_node.port.onmessage = (e) => this.emit("audio-data", e.data), this.source = this.audio_context.createMediaStreamSource(t), this.source.connect(this.resample_node);
  }
  async stop() {
    this.resample_node && (this.source && this.source.disconnect(this.resample_node), this.resample_node.port.onmessage = null, this.resample_node.disconnect()), this.resample_node = null, this.source = null, this.removeAllListeners("audio-data");
  }
}
class z {
  constructor(a) {
    l(this, "playback_node");
    l(this, "analyser_node");
    l(this, "ready");
    this.audio_context = a, this.analyser_node = null, this.playback_node = null, this.ready = new Promise((t) => {
      this.audio_context.audioWorklet.addModule(new URL("data:text/javascript;base64,KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2NsYXNzIG8gZXh0ZW5kcyBBdWRpb1dvcmtsZXRQcm9jZXNzb3J7dWludDg9bmV3IFVpbnQ4QXJyYXkoMCk7b2Zmc2V0PTA7Y29uc3RydWN0b3Iocyl7c3VwZXIocyksdGhpcy5wb3J0Lm9ubWVzc2FnZT10aGlzLmFwcGVuZEJ1ZmZlcnMuYmluZCh0aGlzKX1hc3luYyBhcHBlbmRCdWZmZXJzKHtkYXRhOntidWZmZXI6c319KXtjb25zdCBlPW5ldyBVaW50OEFycmF5KHRoaXMudWludDgubGVuZ3RoK3MubGVuZ3RoKTtyZXR1cm4gZS5zZXQodGhpcy51aW50OCwwKSxlLnNldChzLHRoaXMudWludDgubGVuZ3RoKSx0aGlzLnVpbnQ4PWUsITB9cHJvY2VzcyhzLGUsYSl7Y29uc3QgdT1lWzBdO2lmKHRoaXMub2Zmc2V0Pj10aGlzLnVpbnQ4Lmxlbmd0aClyZXR1cm4hMDtjb25zdCBpPW5ldyBVaW50OEFycmF5KDI1Nik7Zm9yKGxldCB0PTA7dDwyNTYmJiEodGhpcy5vZmZzZXQ+PXRoaXMudWludDgubGVuZ3RoKTt0KyssdGhpcy5vZmZzZXQrKylpW3RdPXRoaXMudWludDhbdGhpcy5vZmZzZXRdO2NvbnN0IHI9bmV3IFVpbnQxNkFycmF5KGkuYnVmZmVyKTtmb3IobGV0IHQ9MDt0PHIubGVuZ3RoO3QrKyl7Y29uc3Qgbj1yW3RdLGY9bj49MzI3Njg/LSg2NTUzNi1uKS8zMjc2ODpuLzMyNzY3O3VbMF1bdF09Zn1yZXR1cm4gdGhpcy51aW50OC5sZW5ndGgtdGhpcy5vZmZzZXQ+MjVlMyYmKHRoaXMub2Zmc2V0Kz0xZTQpLCEwfX1yZWdpc3RlclByb2Nlc3NvcigiYXVkaW8tZGF0YS13b3JrbGV0LXN0cmVhbSIsbyl9KSgpOwo=", import.meta.url)).then(() => t());
    });
  }
  async start() {
    this.audio_context.state !== "running" && await this.audio_context.resume(), this.playback_node = new AudioWorkletNode(this.audio_context, "audio-data-worklet-stream", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      processorOptions: {
        offset: 0
      }
    }), this.playback_node.connect(this.audio_context.destination);
  }
  createAnalyserNode() {
    var t;
    const a = this.audio_context.createAnalyser();
    return (t = this.playback_node) == null || t.connect(a), a.fftSize = 256, this.analyser_node = a, a;
  }
  sendAudioData(a) {
    var t;
    (t = this.playback_node) == null || t.port.postMessage({
      buffer: new Uint8Array(a)
    });
  }
  async stop() {
    var a, t, e;
    (a = this.playback_node) == null || a.port.postMessage({ type: "clear", buffer: [] }), (t = this.playback_node) == null || t.disconnect(), this.playback_node = null, (e = this.analyser_node) == null || e.disconnect(), this.analyser_node = null;
  }
}
class A extends h {
  constructor(t) {
    super();
    l(this, "SOCKET_RECONNECT_CODES", [1001, 1006, 1011, 1015]);
    l(this, "socket", null);
    l(this, "in");
    l(this, "out");
    l(this, "audioAnalyser");
    l(this, "status", "connecting");
    this.microphone = t, this.in = new I(new AudioContext({ latencyHint: 0 })), this.out = new z(new AudioContext({ sampleRate: 16e3, latencyHint: 0 })), this.audioAnalyser = Promise.resolve({});
  }
  async start(t, e) {
    const { device: s } = await this.microphone.start();
    s != null && s.stream && (await this.in.ready, await this.in.start(s.stream), await this.out.ready, await this.out.start(), this.audioAnalyser = Promise.resolve(this.out.createAnalyserNode()), this.socket = this.connect(t, e), this.in.on("audio-data", (i) => {
      var n;
      ((n = this.socket) == null ? void 0 : n.readyState) === WebSocket.OPEN && this.socket.send(i);
    }), this.socket.addEventListener("message", (i) => {
      var n;
      if (new Uint8Array(i.data).length === 4) {
        (n = this.socket) == null || n.send("pong");
        return;
      }
      this.out.sendAudioData(i.data);
    }));
  }
  async stop() {
    var t;
    (t = this.socket) == null || t.close(), this.socket = null, this.microphone.stop(), await this.in.stop(), await this.out.stop();
  }
  connect(t, e) {
    const { server: s } = t, i = `wss://${s.host}:${s.port}?token=${e}`, n = new WebSocket(i);
    return n.binaryType = "arraybuffer", this.status = "connecting", this.emit("status", this.status), this.bindListeners(n, t, e), n;
  }
  bindListeners(t, e, s) {
    t.addEventListener("open", () => {
      this.status = "connected", this.emit("status", this.status);
    }), t.addEventListener("error", () => {
      this.status = "disconnected", this.emit("status", this.status);
    }), t.addEventListener("close", (i) => {
      this.status = "disconnected", this.emit("status", this.status), this.SOCKET_RECONNECT_CODES.includes(i.code) && setTimeout(() => {
        this.socket = this.connect(e, s);
      }, 1e3);
    });
  }
}
class V {
  constructor() {
    l(this, "webRTC", null);
    l(this, "websocket", null);
    l(this, "speaker", new D());
    l(this, "microphone", new G());
  }
  async canCall() {
    const { device: a, err: t } = await this.microphone.start();
    return this.microphone.stop(), a ? { err: null } : { err: t };
  }
  async startTransport(a, t) {
    return t.type === "official" ? (this.webRTC || (this.webRTC = new _(this.microphone)), await this.webRTC.start(t.sdpOffer), this.webRTC) : (this.websocket || (this.websocket = new A(this.microphone)), await this.websocket.start(t, a), this.websocket);
  }
}
class U extends h {
  constructor(t) {
    super();
    l(this, "call_manager");
    l(this, "_devices");
    l(this, "_multimedia");
    this._devices = [...new Set(t.tokens)].map((e) => new C(e)), this._multimedia = new V(), this.call_manager = new W(this._multimedia);
    for (const e of this._devices)
      this.bindDeviceEvents(e);
  }
  onOffer(t) {
    this.removeAllListeners("offer"), this.on("offer", t);
  }
  get multimedia() {
    return {
      microphone: this._multimedia.microphone,
      speaker: this._multimedia.speaker
    };
  }
  getMultimediaDevices() {
    const t = this.multimedia.microphone.devices, e = this.multimedia.speaker.devices;
    return { microphones: t, speakers: e };
  }
  /**
   * Attempts to start an outgoing call using one or more available devices.
   *
   * The method tries each device in sequence until one successfully initiates a call.
   * If all devices fail, it returns a detailed error report listing the reasons per device.
   *
   * @async
   * @function
   *
   * @param {Object} params - Parameters for starting the call.
   * @param {string[]} [params.fromTokens] - Specific device tokens to use.
   *   If omitted, all registered devices will be tried.
   * @param {string} params.to - The peer number (target) to call.
   *
   * @returns {Promise<Object>} A promise that resolves with the result.
   * @returns {Promise<Object>} return.call - The outgoing call on success, otherwise `null`.
   * @returns {Promise<null | Object>} return.err - `null` on success, or an error object if all devices failed.
   * @returns {Promise<string>} [return.err.message] - General error message.
   * @returns {Promise<Array<{ token: string, reason: string }>>} [return.err.devices] - Per-device failure details.
   *
   * @example
   * const result = await instance.startCall({ to: "5511999999999" });
   *
   * if (result.err) {
   *   console.error(result.err.message);
   *   result.err.devices.forEach(d => console.warn(`${d.token}: ${d.reason}`));
   * } else {
   *   console.log("Call started successfully:", result.call);
   * }
   */
  async startCall(t) {
    var n;
    const { err: e } = await this._multimedia.canCall();
    if (e)
      return { call: null, err: { message: e.toString(), devices: [] } };
    const s = (n = t.fromTokens) != null && n.length ? t.fromTokens.map((o) => this._devices.find((c) => c.token === o)).filter((o) => !!o) : this._devices;
    if (!s.length)
      return { call: null, err: { devices: [], message: "Não existe nenhum dispositivo" } };
    const i = [];
    for (const o of s) {
      const c = o.canCall();
      if (c.err) {
        i.push({ token: o.token, reason: c.err });
        continue;
      }
      const { call: u, err: d } = await o.startCall(t.to);
      if (!u) {
        i.push({ token: o.token, reason: d });
        continue;
      }
      return { call: await this.call_manager.buildOutgoing({ ...u, type: "unofficial" }, o), err: null };
    }
    return { call: null, err: { message: "Não foi possível realizar a chamada", devices: i } };
  }
  /**
   * Attempts to start an outgoing call using one or more available devices.
   *
   * This async generator yields the result of each device's call attempt,
   * and eventually returns the first successful call (if any).
   *
   * @async
   * @generator
   * @function
   *
   * @param {Object} params - Parameters for starting the call.
   * @param {string[]} [params.fromTokens] -
   *   Specific device tokens to use. If omitted, all registered devices
   *   will be tried.
   * @param {string} params.to - The peer number (target) to call.
   *
   * @yields {Object} result - Result of an individual device attempt.
   * @yields {null | Object} result.call - The call object if the device succeeded, otherwise `null`.
   * @yields {string} result.token - The token of the device being attempted.
   * @yields {string | null} result.err - Error message if the attempt failed.
   *
   * @returns {Promise<Object>} The first successful call attempt or a final failure result.
   * @returns {Promise<Object>} return.call - The successful `CallOutgoing` instance, or `null` if none succeeded.
   * @returns {Promise<string | null>} return.err - `null` if successful, or an error description.
   * @returns {Promise<string | undefined>} return.token - The device token used for the successful call.
   *
   * @example
   * for await (const result of instance.startCallIterator({ to: "5511999999999" })) {
   *   if (result.err) {
   *     console.warn(`Device ${result.token} failed: ${result.err}`);
   *   } else {
   *     console.log(`Call started via ${result.token}:`, result.call);
   *   }
   * }
   */
  async *startCallIterator(t) {
    var i;
    const { err: e } = await this._multimedia.canCall();
    if (e)
      return { call: null, err: e.toString() };
    const s = (i = t.fromTokens) != null && i.length ? t.fromTokens.map((n) => this._devices.find((o) => o.token === n)).filter((n) => !!n) : this._devices;
    if (!s.length)
      return { call: null, err: "Nenhum dispositivo configurado" };
    for (const n of s) {
      const o = n.canCall();
      if (o.err) {
        yield {
          call: null,
          token: n.token,
          err: o.err
        };
        continue;
      }
      const { call: c, err: u } = await n.startCall(t.to);
      if (!c) {
        yield { call: null, token: n.token, err: u };
        continue;
      }
      return { call: await this.call_manager.buildOutgoing({ ...c, type: "unofficial" }, n), token: n.token };
    }
    return { call: null, err: "Não foi possível realizar a chamada" };
  }
  get devices() {
    return this._devices.map((t) => g(t, this));
  }
  getDevices() {
    return this.devices;
  }
  /**
   * Add devices to instance
   * @param {string[]} tokens - Device tokens.
   * @returns {Device[]} Array containing the added devices
   */
  addDevices(t = []) {
    const e = [];
    for (const s of t) {
      if (this._devices.some((n) => s === n.token)) continue;
      const i = new C(s);
      this._devices.push(i), e.push(i), this.bindDeviceEvents(i);
    }
    return e.map((s) => g(s, this));
  }
  /**
   * Remove devices to instance
   * @param {string[]} tokens - Device tokens.
   * @returns {Device[]} Array containing the rest of the devices
   */
  removeDevices(t) {
    if (!t.length)
      return this.devices;
    const e = [];
    for (const s of this._devices) {
      if (t.includes(s.token)) {
        s.socket.close();
        continue;
      }
      e.push(s);
    }
    return this._devices = e, this.devices;
  }
  /**
   * Iteratively wakes up devices that are in hibernation.
   *
   * This async generator attempts to wake each specified device (or all devices if none are specified)
   * and yields the result for each one.
   *
   * @async
   * @generator
   * @param {string[]} [tokens=[]] - Specific device tokens to wake up.
   *   If omitted, all registered devices will be checked.
   *
   * @yields {{ token: string, waken: boolean }} -
   *   The result for each device, indicating whether it was successfully awakened.
   *
   * @returns {AsyncGenerator<{token: string; waken: boolean;}, void, unknown>}
   *   When all devices have been processed.
   *
   * @example
   * for await (const result of instance.wakeUpDevicesIterator(["abc123", "xyz789"])) {
   *   console.log(`${result.token}: ${result.waken ? "awake" : "still asleep"}`);
   * }
   */
  async *wakeUpDevicesIterator(t = []) {
    const e = t.length ? this._devices.filter((s) => t.includes(s.token)) : this._devices;
    for (const s of e) {
      const i = await s.getInfos();
      yield { token: s.token, waken: !!i };
    }
  }
  /**
   * Wakes up devices that are in hibernation.
   *
   * This method attempts to wake each specified device (or all devices if none are specified)
   * and returns an array of Promises, each resolving to that device's wake-up result.
   *
   * @param {string[]} [tokens=[]] - Specific device tokens to wake up.
   *   If an empty array is passed, all registered devices will be targeted.
   *
   * @returns {Promise<{ token: string, waken: boolean }>[]}
   * An array of Promises, each resolving to an object containing:
   * - `token`: The device token.
   * - `waken`: Whether the device was successfully awakened.
   *
   * @example
   * const results = await Promise.all(instance.wakeUpDevices(["abc123", "xyz789"]));
   * results.forEach(r => {
   *   console.log(`${r.token}: ${r.waken ? "awake" : "still asleep"}`);
   * });
   */
  wakeUpDevices(t = []) {
    return (t.length ? this._devices.filter((s) => t.includes(s.token)) : this._devices).map((s) => s.getInfos().then((i) => ({ token: s.token, waken: !!i })));
  }
  bindDeviceEvents(t) {
    t.socket.on("call:offer", (e) => {
      const s = this.call_manager.buildOffer(e, t);
      this.emit("offer", s);
    }), this.call_manager.bindDeviceEvents(t);
  }
}
export {
  U as Wavoip
};
