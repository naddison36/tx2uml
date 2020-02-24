
export const stringify = (obj: object): string => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value
  )
}
