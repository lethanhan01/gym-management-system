export type LineMessageLocale = 'vi' | 'ja'

export interface LineFlexCommonLocales {
  brandName: string
  defaultEmpty: string
  defaultNotAvailable: string
  detailButton: string
  openAppButton: string
}

export interface LineFlexTrainingLocales {
  badge: string
  title: string
  altText: (params: { trainerName: string; when: string }) => string
  labels: {
    sessionName: string
    when: string
    trainer: string
    room: string
  }
  fallbacks: {
    sessionName: string
    trainerName: string
  }
}

export interface LineFlexTrainingCancelledLocales {
  badge: string
  title: string
  altText: (params: { trainerName: string; when: string }) => string
  labels: {
    sessionName: string
    when: string
    trainer: string
  }
  fallbacks: {
    sessionName: string
    trainerName: string
  }
}

export interface LineFlexTrainingReminderLocales {
  badge: (minutes: number) => string
  title: string
  altText: (params: { trainerName: string; minutes: number }) => string
  labels: {
    sessionName: string
    when: string
    trainer: string
    room: string
  }
  fallbacks: {
    sessionName: string
    trainerName: string
  }
}

export interface LineFlexTrainingStartingLocales {
  badge: string
  title: string
  altText: (params: { trainerName: string }) => string
  labels: {
    sessionName: string
    when: string
    trainer: string
    room: string
  }
  fallbacks: {
    sessionName: string
    trainerName: string
  }
}

export interface LineFlexTrainingCompletedLocales {
  badge: string
  title: string
  altText: (params: { trainerName: string }) => string
  labels: {
    sessionName: string
    when: string
    trainer: string
    room: string
  }
  buttons: {
    review: string
    history: string
  }
  fallbacks: {
    sessionName: string
    trainerName: string
  }
}

export interface LineFlexAttendanceCheckinLocales {
  badge: string
  title: string
  altText: () => string
  labels: {
    checkinTime: string
    branch: string
  }
  buttons: {
    viewCardAndHistory: string
  }
  fallbacks: {
    branchName: string
  }
}

export interface LineFlexSubscriptionExpiringLocales {
  badge: string
  title: string
  altText: (params: { packageName: string; endDate: string }) => string
  labels: {
    packageName: string
    endDate: string
  }
  buttons: {
    renew: string
    detail: string
  }
  fallbacks: {
    packageName: string
  }
}

export interface LineFlexPaymentSuccessLocales {
  badge: string
  title: string
  altText: (params: { packageName: string }) => string
  labels: {
    packageName: string
    amount: string
    paymentMethod: string
    paymentCode: string
    paidAt: string
  }
  buttons: {
    detail: string
  }
  fallbacks: {
    packageName: string
    paymentMethod: string
    paymentCode: string
  }
}

export interface LineFlexFeedbackRespondedLocales {
  badge: string
  title: string
  altText: () => string
  labels: {
    feedbackTitle: string
    respondedAt: string
    responderName: string
  }
  buttons: {
    view: string
  }
  fallbacks: {
    feedbackTitle: string
  }
}

export interface LineFlexWelcomeLocales {
  badge: string
  title: string
  altText: () => string
  labels: {
    guide: string
  }
  guideText: string
  buttons: {
    openApp: string
  }
}

export interface LineFlexHelpAutoReplyLocales {
  badge: string
  title: string
  altText: () => string
  labels: {
    notice: string
  }
  noticeText: string
  buttons: {
    openApp: string
  }
}

export interface LineFlexDictionary {
  common: LineFlexCommonLocales
  trainingCreated: LineFlexTrainingLocales
  trainingUpdated: LineFlexTrainingLocales
  trainingCancelled: LineFlexTrainingCancelledLocales
  trainingReminder: LineFlexTrainingReminderLocales
  trainingStarting: LineFlexTrainingStartingLocales
  trainingCompleted: LineFlexTrainingCompletedLocales
  attendanceCheckin: LineFlexAttendanceCheckinLocales
  subscriptionExpiring: LineFlexSubscriptionExpiringLocales
  paymentSuccess: LineFlexPaymentSuccessLocales
  feedbackResponded: LineFlexFeedbackRespondedLocales
  welcome: LineFlexWelcomeLocales
  helpAutoReply: LineFlexHelpAutoReplyLocales
}

export const LINE_FLEX_LOCALES: Record<LineMessageLocale, LineFlexDictionary> = {
  vi: {
    common: {
      brandName: 'ROGYM',
      defaultEmpty: '—',
      defaultNotAvailable: 'N/A',
      detailButton: 'Xem chi tiết',
      openAppButton: 'Mở ứng dụng',
    },
    trainingCreated: {
      badge: 'ĐẶT LỊCH THÀNH CÔNG',
      title: 'Xác nhận đặt lịch tập PT',
      altText: ({ trainerName, when }) => `[RoGym] Đặt lịch tập thành công với PT ${trainerName} vào ${when}`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Thời gian',
        trainer: 'PT',
        room: 'Phòng tập',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    trainingUpdated: {
      badge: 'ĐÃ ĐIỀU CHỈNH LỊCH',
      title: 'Lịch tập đã được thay đổi',
      altText: ({ trainerName, when }) => `[RoGym] Lịch tập với PT ${trainerName} đã đổi sang ${when}`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Thời gian mới',
        trainer: 'PT',
        room: 'Phòng tập mới',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    trainingCancelled: {
      badge: 'LỊCH TẬP ĐÃ HỦY',
      title: 'Lịch tập đã bị hủy',
      altText: ({ trainerName, when }) => `[RoGym] Lịch tập với PT ${trainerName} vào ${when} đã bị hủy`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Thời gian hủy',
        trainer: 'PT phụ trách',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    trainingReminder: {
      badge: (minutes) => `SẮP ĐẾN GIỜ TẬP (${minutes}P)`,
      title: 'Nhắc nhở buổi tập sắp diễn ra',
      altText: ({ trainerName, minutes }) =>
        `[RoGym] Buổi tập với PT ${trainerName} sẽ bắt đầu sau ${minutes} phút`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Giờ bắt đầu',
        trainer: 'PT',
        room: 'Phòng tập',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    trainingStarting: {
      badge: 'ĐẾN GIỜ TẬP',
      title: 'Đã đến giờ tập luyện',
      altText: ({ trainerName }) => `[RoGym] Đến giờ tập luyện với PT ${trainerName}`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Giờ bắt đầu',
        trainer: 'PT',
        room: 'Phòng tập',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    trainingCompleted: {
      badge: 'BUỔI TẬP HOÀN THÀNH',
      title: 'Buổi tập đã hoàn thành',
      altText: ({ trainerName }) => `[RoGym] Buổi tập với PT ${trainerName} đã hoàn thành`,
      labels: {
        sessionName: 'Bài tập',
        when: 'Thời gian tập',
        trainer: 'PT phụ trách',
        room: 'Phòng tập',
      },
      buttons: {
        review: 'Đánh giá PT',
        history: 'Xem lịch sử',
      },
      fallbacks: {
        sessionName: 'Buổi tập PT',
        trainerName: 'Huấn luyện viên',
      },
    },
    attendanceCheckin: {
      badge: 'CHECK-IN THÀNH CÔNG',
      title: 'Check-in thành công',
      altText: () => '[RoGym] Bạn đã check-in thành công tại RoGym',
      labels: {
        checkinTime: 'Thời gian check-in',
        branch: 'Chi nhánh',
      },
      buttons: {
        viewCardAndHistory: 'Xem thẻ & lịch sử',
      },
      fallbacks: {
        branchName: 'RoGym Fitness Center',
      },
    },
    subscriptionExpiring: {
      badge: 'GÓI TẬP SẮP HẾT HẠN',
      title: 'Gói tập sắp hết hạn',
      altText: ({ packageName, endDate }) =>
        `[RoGym] Gói tập ${packageName} của bạn sắp hết hạn vào ${endDate}`,
      labels: {
        packageName: 'Tên gói tập',
        endDate: 'Ngày hết hạn',
      },
      buttons: {
        renew: 'Gia hạn ngay',
        detail: 'Xem chi tiết gói',
      },
      fallbacks: {
        packageName: 'Gói tập hội viên',
      },
    },
    paymentSuccess: {
      badge: 'THANH TOÁN THÀNH CÔNG',
      title: 'Biên lai thanh toán thành công',
      altText: ({ packageName }) => `[RoGym] Thanh toán thành công gói ${packageName}`,
      labels: {
        packageName: 'Gói dịch vụ',
        amount: 'Số tiền thanh toán',
        paymentMethod: 'Phương thức',
        paymentCode: 'Mã giao dịch',
        paidAt: 'Thời gian',
      },
      buttons: {
        detail: 'Xem chi tiết gói',
      },
      fallbacks: {
        packageName: 'Gói tập hội viên',
        paymentMethod: 'Trực tuyến',
        paymentCode: 'N/A',
      },
    },
    feedbackResponded: {
      badge: 'ĐÃ CÓ PHẢN HỒI GÓP Ý',
      title: 'Đã có phản hồi góp ý',
      altText: () => '[RoGym] Ban quản lý đã phản hồi góp ý của bạn',
      labels: {
        feedbackTitle: 'Tiêu đề góp ý',
        respondedAt: 'Thời gian phản hồi',
        responderName: 'Người phản hồi',
      },
      buttons: {
        view: 'Xem phản hồi',
      },
      fallbacks: {
        feedbackTitle: 'Góp ý hội viên',
      },
    },
    welcome: {
      badge: 'CHÀO MỪNG HỘI VIÊN',
      title: 'Chào mừng bạn đến với RoGym!',
      altText: () => '[RoGym] Chào mừng bạn đến với RoGym',
      labels: {
        guide: 'Hướng dẫn',
      },
      guideText: 'Bấm nút bên dưới để mở ứng dụng hội viên và khám phá các tiện ích.',
      buttons: {
        openApp: 'Mở ứng dụng',
      },
    },
    helpAutoReply: {
      badge: 'HỖ TRỢ TỰ ĐỘNG',
      title: 'Trung tâm hỗ trợ RoGym',
      altText: () => '[RoGym] Trung tâm hỗ trợ tự động RoGym',
      labels: {
        notice: 'Thông báo',
      },
      noticeText:
        'RoGym không hỗ trợ trả lời tin nhắn trực tiếp. Bấm nút bên dưới để mở ứng dụng hội viên.',
      buttons: {
        openApp: 'Mở ứng dụng',
      },
    },
  },
  ja: {
    common: {
      brandName: 'ROGYM',
      defaultEmpty: '—',
      defaultNotAvailable: 'N/A',
      detailButton: '詳細を見る',
      openAppButton: 'アプリを開く',
    },
    trainingCreated: {
      badge: '予約完了',
      title: 'トレーニング予約が完了しました',
      altText: ({ trainerName, when }) =>
        `[RoGym] PT ${trainerName} とのトレーニング予約が完了しました（${when}）`,
      labels: {
        sessionName: '内容',
        when: '日時',
        trainer: 'PT',
        room: 'ルーム',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    trainingUpdated: {
      badge: '予約変更',
      title: 'トレーニング予約が更新されました',
      altText: ({ trainerName, when }) =>
        `[RoGym] PT ${trainerName} とのトレーニング予約が変更されました（${when}）`,
      labels: {
        sessionName: '内容',
        when: '新しい日時',
        trainer: 'PT',
        room: '新しいルーム',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    trainingCancelled: {
      badge: '予約キャンセル',
      title: 'トレーニング予約がキャンセルされました',
      altText: ({ trainerName, when }) =>
        `[RoGym] PT ${trainerName} とのトレーニング予約（${when}）はキャンセルされました`,
      labels: {
        sessionName: '内容',
        when: '日時',
        trainer: '担当PT',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    trainingReminder: {
      badge: (minutes) => `まもなく開始 (${minutes}分前)`,
      title: 'まもなくトレーニング開始です',
      altText: ({ trainerName, minutes }) =>
        `[RoGym] PT ${trainerName} とのトレーニング開始まであと${minutes}分です`,
      labels: {
        sessionName: '内容',
        when: '開始日時',
        trainer: 'PT',
        room: 'ルーム',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    trainingStarting: {
      badge: 'セッション開始',
      title: 'トレーニングの時間です',
      altText: ({ trainerName }) => `[RoGym] PT ${trainerName} とのトレーニングの時間になりました`,
      labels: {
        sessionName: '内容',
        when: '開始日時',
        trainer: 'PT',
        room: 'ルーム',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    trainingCompleted: {
      badge: 'セッション完了',
      title: 'セッション完了',
      altText: ({ trainerName }) =>
        `[RoGym] PT ${trainerName} とのトレーニングセッションが完了しました`,
      labels: {
        sessionName: '内容',
        when: '実施日時',
        trainer: '担当PT',
        room: 'ルーム',
      },
      buttons: {
        review: 'PTを評価',
        history: '履歴を見る',
      },
      fallbacks: {
        sessionName: 'PTセッション',
        trainerName: '担当PT',
      },
    },
    attendanceCheckin: {
      badge: 'チェックイン完了',
      title: 'チェックイン完了',
      altText: () => '[RoGym] RoGymでのチェックインが完了しました',
      labels: {
        checkinTime: 'チェックイン日時',
        branch: '店舗',
      },
      buttons: {
        viewCardAndHistory: '会員証・履歴を見る',
      },
      fallbacks: {
        branchName: 'RoGymフィットネス',
      },
    },
    subscriptionExpiring: {
      badge: '有効期限間近',
      title: 'プランの有効期限間近',
      altText: ({ packageName, endDate }) =>
        `[RoGym] ご利用プラン「${packageName}」は${endDate}に有効期限が切れます`,
      labels: {
        packageName: 'プラン名',
        endDate: '有効期限',
      },
      buttons: {
        renew: '今すぐ更新',
        detail: 'プラン詳細を見る',
      },
      fallbacks: {
        packageName: 'メンバーシッププラン',
      },
    },
    paymentSuccess: {
      badge: 'お支払い完了',
      title: 'お支払いが完了しました',
      altText: ({ packageName }) => `[RoGym] プラン「${packageName}」のお支払いが完了しました`,
      labels: {
        packageName: 'ご利用プラン',
        amount: 'お支払い金額',
        paymentMethod: 'お支払い方法',
        paymentCode: '決済番号',
        paidAt: '決済日時',
      },
      buttons: {
        detail: 'プラン詳細を見る',
      },
      fallbacks: {
        packageName: 'メンバーシッププラン',
        paymentMethod: 'オンライン決済',
        paymentCode: 'N/A',
      },
    },
    feedbackResponded: {
      badge: 'ご意見への返答',
      title: 'ご意見への返答が届きました',
      altText: () => '[RoGym] ご意見への返答が届きました',
      labels: {
        feedbackTitle: 'ご意見の件名',
        respondedAt: '返答日時',
        responderName: '担当',
      },
      buttons: {
        view: '返答を確認',
      },
      fallbacks: {
        feedbackTitle: '会員からのご意見',
      },
    },
    welcome: {
      badge: 'RoGymへようこそ',
      title: 'RoGymへようこそ！',
      altText: () => '[RoGym] RoGymへようこそ',
      labels: {
        guide: 'ご利用案内',
      },
      guideText: '下のボタンから会員アプリを開いてください。',
      buttons: {
        openApp: 'アプリを開く',
      },
    },
    helpAutoReply: {
      badge: '自動応答サポート',
      title: 'RoGymサポートデスク',
      altText: () => '[RoGym] RoGym自動応答サポート',
      labels: {
        notice: 'ご案内',
      },
      noticeText:
        'RoGymはLINEでの直接返信に対応しておりません。会員アプリをご利用ください。',
      buttons: {
        openApp: 'アプリを開く',
      },
    },
  },
}

/**
 * Lấy từ điển ngôn ngữ chuẩn theo locale ('vi' hoặc 'ja')
 */
export function getFlexLocales(locale: LineMessageLocale): LineFlexDictionary {
  return LINE_FLEX_LOCALES[locale] || LINE_FLEX_LOCALES.vi
}
