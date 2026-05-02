import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'

function hexToRgba(hex) {
  if (!hex || typeof hex !== 'string') return '#000000ff'
  const h = hex.trim()
  if (h.length === 7 && h.startsWith('#')) return `${h}ff`
  if (h.length === 9 && h.startsWith('#')) return h
  return '#000000ff'
}

function buildRendererOptions(imageType, quality) {
  if (imageType === 'image/jpeg' || imageType === 'image/webp') {
    return { quality: Number(quality) || 0.92 }
  }
  return undefined
}

export default function App() {
  const canvasRef = useRef(null)
  const [text, setText] = useState('https://example.com')
  const [debouncedText, setDebouncedText] = useState(text)
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState('M')
  const [version, setVersion] = useState('')
  const [maskPattern, setMaskPattern] = useState('')
  const [margin, setMargin] = useState(4)
  const [scale, setScale] = useState(4)
  const [width, setWidth] = useState('')
  const [darkColor, setDarkColor] = useState('#000000')
  const [lightColor, setLightColor] = useState('#ffffff')
  const [imageType, setImageType] = useState('png')
  const [quality, setQuality] = useState(0.92)
  const [stringType, setStringType] = useState('svg')
  const [useSegments, setUseSegments] = useState(false)
  const [segmentsJson, setSegmentsJson] = useState(
    '[\n  { "data": "HELLO", "mode": "alphanumeric" },\n  { "data": "123", "mode": "numeric" }\n]',
  )
  const [error, setError] = useState(null)
  const [dataUrl, setDataUrl] = useState('')
  const [stringOut, setStringOut] = useState('')
  const [createInfo, setCreateInfo] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(text), 250)
    return () => clearTimeout(t)
  }, [text])

  const mimeType = useMemo(() => {
    if (imageType === 'jpeg') return 'image/jpeg'
    if (imageType === 'webp') return 'image/webp'
    return 'image/png'
  }, [imageType])

  const qrOptions = useMemo(() => {
    const opts = {
      errorCorrectionLevel,
      margin: Number(margin) || 0,
      scale: Number(scale) || 4,
      color: {
        dark: hexToRgba(darkColor),
        light: hexToRgba(lightColor),
      },
    }
    const v = parseInt(version, 10)
    if (version !== '' && !Number.isNaN(v) && v >= 1 && v <= 40) opts.version = v
    const m = parseInt(maskPattern, 10)
    if (maskPattern !== '' && !Number.isNaN(m) && m >= 0 && m <= 7) opts.maskPattern = m
    const w = parseInt(width, 10)
    if (width !== '' && !Number.isNaN(w) && w > 0) opts.width = w
    return opts
  }, [
    errorCorrectionLevel,
    margin,
    scale,
    width,
    version,
    maskPattern,
    darkColor,
    lightColor,
  ])

  const parsePayload = useCallback(() => {
    if (useSegments) {
      const parsed = JSON.parse(segmentsJson)
      if (!Array.isArray(parsed)) throw new Error('Segments must be a JSON array')
      return parsed
    }
    return debouncedText
  }, [useSegments, segmentsJson, debouncedText])

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const run = async () => {
      setError(null)
      let payload
      try {
        payload = parsePayload()
      } catch (e) {
        setError(e.message || 'Invalid segments JSON')
        setDataUrl('')
        setStringOut('')
        setCreateInfo('')
        return
      }

      const dataUrlOpts = {
        ...qrOptions,
        type: mimeType,
        rendererOpts: buildRendererOptions(mimeType, quality),
      }

      try {
        await QRCode.toCanvas(canvas, payload, qrOptions)
        const url = await QRCode.toDataURL(payload, dataUrlOpts)
        const str = await QRCode.toString(payload, { ...qrOptions, type: stringType })
        const created = await QRCode.create(payload, qrOptions)
        const info = {
          version: created.version,
          errorCorrectionLevel: created.errorCorrectionLevel,
          maskPattern: created.maskPattern,
          segments: created.segments,
        }
        if (!cancelled) {
          setDataUrl(url)
          setStringOut(str)
          setCreateInfo(JSON.stringify(info, null, 2))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || String(e))
          setDataUrl('')
          setStringOut('')
          setCreateInfo('')
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [debouncedText, parsePayload, qrOptions, mimeType, quality, stringType, useSegments])

  const downloadName = useMemo(() => {
    if (mimeType === 'image/jpeg') return 'qrcode.jpg'
    if (mimeType === 'image/webp') return 'qrcode.webp'
    return 'qrcode.png'
  }, [mimeType])

  return (
    <div className="app">
      <header className="header">
        <h1>QR Code Generator</h1>
        <p className="tagline">Controls for the <code>qrcode</code> package (browser APIs).</p>
      </header>

      <div className="layout">
        <section className="panel controls">
          <label className="field">
            <span>Content</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Text or URL"
              disabled={useSegments}
            />
          </label>

          <details className="advanced">
            <summary>Advanced: manual segments (JSON)</summary>
            <label className="check">
              <input
                type="checkbox"
                checked={useSegments}
                onChange={(e) => setUseSegments(e.target.checked)}
              />
              Use segments instead of plain text
            </label>
            <textarea
              className="segments"
              value={segmentsJson}
              onChange={(e) => setSegmentsJson(e.target.value)}
              rows={8}
              disabled={!useSegments}
              spellCheck={false}
            />
          </details>

          <div className="grid2">
            <label className="field">
              <span>Error correction</span>
              <select
                value={errorCorrectionLevel}
                onChange={(e) => setErrorCorrectionLevel(e.target.value)}
              >
                <option value="L">L — low (~7%)</option>
                <option value="M">M — medium (~15%)</option>
                <option value="Q">Q — quartile (~25%)</option>
                <option value="H">H — high (~30%)</option>
              </select>
            </label>
            <label className="field">
              <span>Version (1–40, blank = auto)</span>
              <input
                type="number"
                min={1}
                max={40}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="auto"
              />
            </label>
            <label className="field">
              <span>Mask (0–7, blank = auto)</span>
              <input
                type="number"
                min={0}
                max={7}
                value={maskPattern}
                onChange={(e) => setMaskPattern(e.target.value)}
                placeholder="auto"
              />
            </label>
            <label className="field">
              <span>Margin (quiet zone)</span>
              <input
                type="number"
                min={0}
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Scale (px per module)</span>
              <input
                type="number"
                min={1}
                value={scale}
                onChange={(e) => setScale(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Width (px, optional)</span>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="use scale"
              />
            </label>
            <label className="field">
              <span>Dark modules</span>
              <input
                type="color"
                value={darkColor.length === 7 ? darkColor : '#000000'}
                onChange={(e) => setDarkColor(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Light modules</span>
              <input
                type="color"
                value={lightColor.length === 7 ? lightColor : '#ffffff'}
                onChange={(e) => setLightColor(e.target.value)}
              />
            </label>
          </div>

          <fieldset className="fieldset">
            <legend>Download image (<code>toDataURL</code>)</legend>
            <div className="row">
              <label className="field inline">
                <span>Type</span>
                <select value={imageType} onChange={(e) => setImageType(e.target.value)}>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
              {(imageType === 'jpeg' || imageType === 'webp') && (
                <label className="field inline">
                  <span>Quality</span>
                  <input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </label>
              )}
            </div>
            <a
              className="button secondary"
              href={dataUrl || '#'}
              download={downloadName}
              onClick={(e) => {
                if (!dataUrl) e.preventDefault()
              }}
            >
              Download
            </a>
          </fieldset>

          <fieldset className="fieldset">
            <legend>Text output (<code>toString</code>)</legend>
            <label className="field">
              <span>Format</span>
              <select value={stringType} onChange={(e) => setStringType(e.target.value)}>
                <option value="svg">SVG</option>
                <option value="utf8">UTF-8 text</option>
              </select>
            </label>
          </fieldset>
        </section>

        <section className="panel preview">
          {error && <div className="banner error" role="alert">{error}</div>}
          <div className="canvas-wrap">
            <canvas ref={canvasRef} />
          </div>
          {dataUrl && (
            <figure className="thumb">
              <figcaption>Data URL preview</figcaption>
              <img src={dataUrl} alt="QR from toDataURL" />
            </figure>
          )}
          <div className="field">
            <span><code>QRCode.create</code> metadata</span>
            <pre className="meta">{createInfo || '—'}</pre>
          </div>
          <div className="field">
            <span><code>toString</code> ({stringType})</span>
            <pre className="string-out">{stringOut || '—'}</pre>
          </div>
        </section>
      </div>
    </div>
  )
}
