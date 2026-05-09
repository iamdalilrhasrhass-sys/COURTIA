import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { useAuthStore } from '../stores/authStore'

export default function useFeatureFlag(flagKey) {
  const user = useAuthStore((state) => state.user)
  const [remoteFlags, setRemoteFlags] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get('/feature-flags')
      .then((response) => {
        if (!cancelled) setRemoteFlags(response.data?.flags || {})
      })
      .catch(() => {
        if (!cancelled) setRemoteFlags(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const flags = useMemo(
    () => remoteFlags || user?.feature_flags || {},
    [remoteFlags, user?.feature_flags]
  )

  return {
    enabled: Boolean(flags?.[flagKey]),
    loading: remoteFlags === null && !user?.feature_flags,
    flags,
  }
}
