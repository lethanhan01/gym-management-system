export const NEW_LAST_NAMES = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
]

export const NEW_FIRST_NAMES = [
  'An',
  'Bình',
  'Chi',
  'Dũng',
  'Phong',
  'Giang',
  'Huy',
  'Khánh',
  'Lan',
  'Minh',
  'Nam',
  'Oanh',
  'Phúc',
  'Quân',
  'Sơn',
  'Thảo',
  'Uyên',
  'Vân',
  'Xuân',
  'Yến',
  'Ánh',
  'Bảo',
  'Cường',
  'Diễm',
  'Đức',
  'Hà',
  'Hậu',
  'Khoa',
  'Liêm',
  'Quỳnh',
]

export const NEW_MIDDLE_NAMES = [
  'Văn',
  'Thị',
  'Hữu',
  'Quốc',
  'Minh',
  'Ngọc',
  'Bích',
  'Thanh',
  'Đình',
  'Công',
]

export const HCM_ADDRESSES = [
  '12 Nguyễn Trãi, Phường 2, Quận 5',
  '45 Lê Lợi, Phường Bến Nghé, Quận 1',
  '78 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1',
  '23 Cộng Hòa, Phường 4, Tân Bình',
  '56 Phan Văn Trị, Phường 11, Bình Thạnh',
  '90 Nguyễn Thị Minh Khai, Phường 2, Quận 3',
  '34 Lạc Long Quân, Phường 3, Tân Bình',
  '67 Đinh Tiên Hoàng, Phường 3, Bình Thạnh',
  '11 Cách Mạng Tháng 8, Phường 11, Quận 3',
  '89 Nguyễn Văn Cừ, Phường 2, Quận 5',
  '15 Nguyễn Hữu Thọ, Phường Tân Phong, Quận 7',
  '42 Lê Văn Lương, Phường Tân Phú, Quận 7',
  '33 Huỳnh Tấn Phát, Phường Bình Thuận, Quận 7',
  '77 Trần Não, Phường Bình An, Quận 2',
  '19 Bạch Đằng, Phường 24, Bình Thạnh',
  '55 Quang Trung, Phường 10, Gò Vấp',
  '88 Nguyễn Kiệm, Phường 3, Gò Vấp',
  '26 Lê Đức Thọ, Phường 16, Gò Vấp',
  '14 Trường Chinh, Phường 13, Tân Bình',
  '63 Âu Cơ, Phường 9, Tân Bình',
]

export const NEW_DIACRITICS: Record<string, string> = {
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ý: 'y',
  ă: 'a',
  ắ: 'a',
  ặ: 'a',
  ằ: 'a',
  ẳ: 'a',
  ẵ: 'a',
  ấ: 'a',
  ầ: 'a',
  ẩ: 'a',
  ẫ: 'a',
  ậ: 'a',
  đ: 'd',
  ế: 'e',
  ề: 'e',
  ệ: 'e',
  ể: 'e',
  ễ: 'e',
  ỉ: 'i',
  ị: 'i',
  ố: 'o',
  ồ: 'o',
  ổ: 'o',
  ỗ: 'o',
  ộ: 'o',
  ớ: 'o',
  ờ: 'o',
  ở: 'o',
  ỡ: 'o',
  ợ: 'o',
  ơ: 'o',
  ứ: 'u',
  ừ: 'u',
  ử: 'u',
  ữ: 'u',
  ự: 'u',
  ư: 'u',
  ỳ: 'y',
  ỵ: 'y',
  ỷ: 'y',
  ỹ: 'y',
}

export function removeDiacritics(str: string): string {
  return str
    .toLowerCase()
    .split('')
    .map((c) => NEW_DIACRITICS[c] ?? c)
    .join('')
}

export function makeEmail(fullName: string, index: number): string {
  const parts = removeDiacritics(fullName).split(' ')
  return `${parts[parts.length - 1]}.${parts[0]}.${String(index).padStart(3, '0')}@gym.local`
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function getTrainerCodeForMember(memberIdx: number): string {
  if (memberIdx < 25) {
    return `STF-PT-${String(3 + Math.floor(memberIdx / 5)).padStart(3, '0')}`
  }
  const within = memberIdx - 25
  if (within < 10) {
    return `STF-PT-${String(8 + Math.floor(within / 2)).padStart(3, '0')}`
  }
  return `STF-PT-${String(13 + (within - 10)).padStart(3, '0')}`
}
