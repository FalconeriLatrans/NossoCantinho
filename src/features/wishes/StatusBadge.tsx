import { WISH_STATUS_LABEL } from '../../constants'
import type { WishStatus } from '../../types'

export function StatusBadge({ status }: { status: WishStatus }) {
  return <span className={`badge badge--${status}`}>{WISH_STATUS_LABEL[status]}</span>
}
