'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { DraftSaveResult } from '@/lib/api'

type Zone = 'FRONT' | 'BACK' | 'TAG'

interface Layer {
  id: string
  type: 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize?: number
  color?: string
  zone: Zone
}

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  productId: string | null
  variantId: string | null
  quantity: number
  layers: Layer[]
  uploadIds: Record<string, string>
  isReady: boolean
  onRestore: (draft: {
    id: string
    variantId: string
    quantity: number
    zonesData: Record<string, unknown>
    uploadIds: Record<string, string>
  }) => void
}

function groupLayersByZone(layers: Layer[]): Record<string, unknown> {
  const zones: Record<string, Layer[]> = {}
  for (const layer of layers) {
    if (!zones[layer.zone]) zones[layer.zone] = []
    // Strip base64 dataUrls from image layers — they're huge and are already
    // tracked server-side via uploadIds. On restore we skip image layers without
    // content (text layers and variant/quantity restore fine).
    const layerToSave: Layer =
      layer.type === 'image' ? { ...layer, content: '' } : layer
    zones[layer.zone].push(layerToSave)
  }
  return zones
}

export function useAutosave({
  productId,
  variantId,
  quantity,
  layers,
  uploadIds,
  isReady,
  onRestore,
}: UseAutosaveOptions) {
  const draftIdRef = useRef<string | null>(null)
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  // Restore active draft on mount
  useEffect(() => {
    if (!productId) return

    api
      .get<{
        id: string
        variantId: string
        quantity: number
        zonesData: Record<string, unknown>
        uploadIds: Record<string, string>
      } | null>(`/drafts/active?productId=${productId}`)
      .then((draft) => {
        // Only restore if no save has already populated draftIdRef this session.
        // Prevents the GET response (which can arrive after the 2s debounce fires)
        // from overwriting a draft ID that POST already set.
        if (draft && !draftIdRef.current) {
          draftIdRef.current = draft.id
          onRestore(draft)
        }
      })
      .catch(() => {
        // Non-fatal: fresh editor if restore fails
      })
    // onRestore intentionally omitted — stable function reference expected from caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // Debounced save — triggers 2s after any change
  useEffect(() => {
    if (!isReady || !variantId || !productId) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return
      isSavingRef.current = true
      setStatus('saving')

      try {
        const zonesData = groupLayersByZone(layers)
        let result: DraftSaveResult
        if (draftIdRef.current) {
          // PATCH: productId is immutable after creation, not accepted by UpdateDraftDto
          result = await api.patch<DraftSaveResult>(`/drafts/${draftIdRef.current}`, {
            variantId,
            quantity,
            zonesData,
            uploadIds,
          })
        } else {
          result = await api.post<DraftSaveResult>('/drafts', {
            productId,
            variantId,
            quantity,
            zonesData,
            uploadIds,
          })
        }

        draftIdRef.current = result.id
        setStatus('saved')
      } catch {
        setStatus('error')
      } finally {
        isSavingRef.current = false
      }
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [layers, uploadIds, variantId, quantity, isReady, productId])

  /**
   * Flush any pending save immediately and return the draft ID.
   * Call before "Add to cart" to ensure draft exists on the server.
   */
  const flushSave = useCallback(async (): Promise<string | null> => {
    if (!variantId || !productId) return null
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (isSavingRef.current) {
      // Poll up to 3 s (12 × 250 ms) for the concurrent save to finish.
      for (let i = 0; i < 12; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        if (!isSavingRef.current) break
      }
      // If the concurrent save populated draftIdRef, use it.
      // Otherwise fall through and do our own save attempt below.
      if (draftIdRef.current) return draftIdRef.current
    }

    isSavingRef.current = true
    setStatus('saving')

    try {
      const zonesData = groupLayersByZone(layers)
      let result: DraftSaveResult
      if (draftIdRef.current) {
        result = await api.patch<DraftSaveResult>(`/drafts/${draftIdRef.current}`, {
          variantId,
          quantity,
          zonesData,
          uploadIds,
        })
      } else {
        result = await api.post<DraftSaveResult>('/drafts', {
          productId,
          variantId,
          quantity,
          zonesData,
          uploadIds,
        })
      }

      draftIdRef.current = result.id
      setStatus('saved')
      return result.id
    } catch {
      setStatus('error')
      return null
    } finally {
      isSavingRef.current = false
    }
  }, [variantId, productId, quantity, layers, uploadIds])

  return {
    status,
    draftId: draftIdRef.current,
    flushSave,
  }
}
