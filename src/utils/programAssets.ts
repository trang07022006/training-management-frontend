/**
 * Helper cung cấp hình ảnh minh họa cho các chương trình đào tạo
 * Dựa trên từ khóa của tên / mã chương trình.
 * Tuân thủ quy định: Chỉ dùng cho visual minh họa ngành học, KHÔNG dùng làm logo.
 */

export interface ProgramVisualMeta {
  accentColor: string
  category: string
  bgGradient: string
  iconType: 'code' | 'shield' | 'network' | 'ai' | 'media' | 'data' | 'system'
}

export function getProgramVisualMeta(code?: string, name?: string): ProgramVisualMeta {
  const text = `${code || ''} ${name || ''}`.toLowerCase()

  if (text.includes('an toàn') || text.includes('bảo mật') || text.includes('security') || text.includes('attt')) {
    return {
      accentColor: '#059669',
      category: 'An toàn thông tin',
      bgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
      iconType: 'shield',
    }
  }

  if (text.includes('trí tuệ nhân tạo') || text.includes('ai') || text.includes('robot') || text.includes('dữ liệu')) {
    return {
      accentColor: '#7c3aed',
      category: 'Trí tuệ nhân tạo & Dữ liệu',
      bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
      iconType: 'ai',
    }
  }

  if (text.includes('mạng') || text.includes('viễn thông') || text.includes('network') || text.includes('cloud')) {
    return {
      accentColor: '#0284c7',
      category: 'Mạng & Truyền thông',
      bgGradient: 'linear-gradient(135deg, #075985 0%, #0284c7 100%)',
      iconType: 'network',
    }
  }

  if (text.includes('truyền thông') || text.includes('đa phương tiện') || text.includes('media') || text.includes('thiết kế')) {
    return {
      accentColor: '#ea580c',
      category: 'Truyền thông Đa phương tiện',
      bgGradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)',
      iconType: 'media',
    }
  }

  if (text.includes('hệ thống') || text.includes('kinh tế') || text.includes('quản lý') || text.includes('is')) {
    return {
      accentColor: '#d97706',
      category: 'Hệ thống thông tin',
      bgGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
      iconType: 'system',
    }
  }

  // Mặc định: Công nghệ thông tin / Kỹ thuật phần mềm
  return {
    accentColor: '#0874c9',
    category: 'Công nghệ thông tin',
    bgGradient: 'linear-gradient(135deg, #0b2852 0%, #0874c9 100%)',
    iconType: 'code',
  }
}
