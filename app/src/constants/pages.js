import { normalize, join } from 'path'
import { format } from 'url'

const pathname = normalize(join(__dirname, '../pages/index.html'))
const pages = format({
  protocol: 'file:',
  slashes: true,
  pathname,
})

export const urls = {
  domain: `${pages}?page=domain`,
  loading: `${pages}?page=loading`,
  connectionError: `${pages}?page=connectionError`,
  tokenAuth: `${pages}?page=tokenAuth`,
  about: `${pages}?page=about`,
}
