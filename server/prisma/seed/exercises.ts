import { ExerciseCategory } from '@prisma/client'
import { prisma } from './client'

type ApiExercise = {
  name: string
  category: string
  muscleGroup: string
  equipmentNeeded: string
  description: string
  imageUrl: string
}

let EXERCISES_FROM_API: ApiExercise[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EXERCISES_FROM_API = require('../exercises-cache.json') as ApiExercise[]
} catch {
  // Cache chua ton tai — chay `npm run fetch:exercises` truoc
}

// ---------------------------------------------------------------------------
// EXERCISE LIBRARY (20 bai tap)
// ---------------------------------------------------------------------------

const EXERCISE_LIBRARY = [
  {
    name: 'Squat',
    category: ExerciseCategory.strength,
    muscleGroup: 'Đùi trước, mông, gân kheo, core',
    equipmentNeeded: 'Tạ đòn và rack (tùy chọn)',
    description:
      'Đứng chân rộng bằng vai, siết core, đẩy hông ra sau và hạ người đến khi đùi gần song song sàn. Giữ gối cùng hướng mũi chân rồi đạp qua giữa bàn chân để đứng lên.',
    imageUrl: '/exercises/squat.png',
  },
  {
    name: 'Deadlift',
    category: ExerciseCategory.strength,
    muscleGroup: 'Lưng dưới, mông, gân kheo, cẳng tay',
    equipmentNeeded: 'Tạ đòn và bánh tạ',
    description:
      'Đặt thanh tạ sát ống chân, gập hông với lưng trung lập, nắm chắc thanh và đẩy sàn bằng hai chân. Đứng thẳng bằng cách duỗi hông, không ngửa lưng ở vị trí khóa.',
    imageUrl: '/exercises/deadlift.png',
  },
  {
    name: 'Bench Press',
    category: ExerciseCategory.strength,
    muscleGroup: 'Ngực, vai trước, tay sau',
    equipmentNeeded: 'Ghế phẳng, rack, tạ đòn',
    description:
      'Nằm chắc trên ghế, kéo bả vai về sau, hạ thanh tạ có kiểm soát về giữa ngực. Đẩy thanh lên theo đường hơi chéo về phía vai và luôn giữ cổ tay thẳng.',
    imageUrl: '/exercises/bench-press.png',
  },
  {
    name: 'Overhead Press',
    category: ExerciseCategory.strength,
    muscleGroup: 'Vai, tay sau, core',
    equipmentNeeded: 'Tạ đòn hoặc tạ đơn',
    description:
      'Giữ tạ ngang vai, siết mông và core, đẩy tạ thẳng qua đầu. Kết thúc khi tay duỗi và tạ nằm trên đường giữa cơ thể, tránh ưỡn lưng quá mức.',
    imageUrl: '/exercises/overhead-press.png',
  },
  {
    name: 'Barbell Row',
    category: ExerciseCategory.strength,
    muscleGroup: 'Lưng giữa, xô, vai sau, tay trước',
    equipmentNeeded: 'Tạ đòn',
    description:
      'Gập hông, giữ cột sống trung lập và thân người gần song song sàn. Kéo thanh tạ về bụng dưới bằng khuỷu tay, siết bả vai rồi hạ tạ chậm.',
    imageUrl: '/exercises/barbell-row.png',
  },
  {
    name: 'Pull-up',
    category: ExerciseCategory.strength,
    muscleGroup: 'Cơ xô, lưng trên, tay trước',
    equipmentNeeded: 'Xà đơn',
    description:
      'Treo người với vai chủ động, kéo khuỷu tay xuống và đưa ngực về phía xà. Hạ người có kiểm soát đến khi tay duỗi, không vung chân lấy đà.',
    imageUrl: '/exercises/pull-up.png',
  },
  {
    name: 'Push-up',
    category: ExerciseCategory.strength,
    muscleGroup: 'Ngực, tay sau, vai trước, core',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Giữ cơ thể thành một đường thẳng từ đầu đến gót, hạ ngực xuống bằng cách gập khuỷu khoảng 30-45 độ. Đẩy sàn ra xa và giữ hông không võng.',
    imageUrl: '/exercises/push-up.png',
  },
  {
    name: 'Lunge',
    category: ExerciseCategory.strength,
    muscleGroup: 'Đùi trước, mông, gân kheo',
    equipmentNeeded: 'Không cần dụng cụ hoặc tạ đơn',
    description:
      'Bước một chân về trước, hạ gối sau gần sàn và giữ thân người thẳng. Đạp qua bàn chân trước để trở về vị trí ban đầu, tránh để gối đổ vào trong.',
    imageUrl: '/exercises/lunge.png',
  },
  {
    name: 'Treadmill Run',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, chân, mông',
    equipmentNeeded: 'Máy chạy bộ',
    description:
      'Khởi động ở tốc độ thấp, tăng dần đến vùng nhịp tim mục tiêu và giữ bước chân nhẹ dưới trọng tâm. Không bám tay vịn khi chạy ổn định.',
    imageUrl: '/exercises/treadmill-run.png',
  },
  {
    name: 'Jump Rope',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, bắp chân, vai, core',
    equipmentNeeded: 'Dây nhảy',
    description:
      'Giữ khuỷu sát thân, quay dây chủ yếu bằng cổ tay và bật thấp bằng nửa trước bàn chân. Duy trì nhịp đều, tiếp đất mềm để giảm tải khớp.',
    imageUrl: '/exercises/jump-rope.png',
  },
  {
    name: 'Cycling',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, đùi trước, mông, bắp chân',
    equipmentNeeded: 'Xe đạp tập',
    description:
      'Chỉnh yên để gối còn hơi chùng ở điểm thấp nhất, giữ lưng trung lập và đạp vòng tròn đều. Điều chỉnh kháng lực để duy trì đúng vùng cường độ.',
    imageUrl: '/exercises/cycling.png',
  },
  {
    name: 'Hip Flexor Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Cơ gấp hông, đùi trước',
    equipmentNeeded: 'Thảm tập',
    description:
      'Quỳ một gối, siết mông bên chân quỳ và đẩy hông nhẹ về trước. Giữ xương chậu trung lập, không ưỡn lưng để cảm nhận căng ở trước hông.',
    imageUrl: '/exercises/hip-flexor-stretch.png',
  },
  {
    name: 'Hamstring Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Gân kheo, bắp chân',
    equipmentNeeded: 'Thảm tập hoặc dây hỗ trợ',
    description:
      'Duỗi một chân, gập người từ khớp hông với lưng dài và hướng ngực về bàn chân. Chỉ đi đến mức căng dễ chịu, không giật nảy.',
    imageUrl: '/exercises/hamstring-stretch.png',
  },
  {
    name: 'Shoulder Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Vai sau, lưng trên',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Kéo một tay ngang qua ngực bằng tay còn lại, giữ vai thấp và thân người hướng thẳng. Duy trì lực kéo nhẹ, không ép vào khớp khuỷu.',
    imageUrl: '/exercises/shoulder-stretch.png',
  },
  {
    name: 'Single-Leg Stand',
    category: ExerciseCategory.balance,
    muscleGroup: 'Cổ chân, mông nhỡ, core',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Đứng trên một chân, hơi chùng gối trụ và giữ hông cân bằng. Nhìn vào một điểm cố định, siết core và tăng độ khó bằng cách nhắm mắt hoặc đổi bề mặt.',
    imageUrl: '/exercises/single-leg-stand.png',
  },
  {
    name: 'Plank',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core, vai, mông',
    equipmentNeeded: 'Thảm tập',
    description:
      'Chống cẳng tay dưới vai, siết bụng và mông để cơ thể thành đường thẳng. Thở đều, không để hông võng hoặc nâng quá cao.',
    imageUrl: '/exercises/plank.png',
  },
  {
    name: 'Bosu Ball Squat',
    category: ExerciseCategory.balance,
    muscleGroup: 'Đùi, mông, cổ chân, core',
    equipmentNeeded: 'Bóng BOSU',
    description:
      'Đứng cân bằng trên BOSU, giữ ngực mở và hạ squat chậm trong biên độ kiểm soát. Ưu tiên ổn định gối, cổ chân trước khi tăng độ sâu.',
    imageUrl: '/exercises/bosu-ball-squat.png',
  },
  {
    name: 'Side Plank',
    category: ExerciseCategory.balance,
    muscleGroup: 'Cơ liên sườn, vai, mông nhỡ',
    equipmentNeeded: 'Thảm tập',
    description:
      'Chống khuỷu ngay dưới vai, xếp hai chân và nâng hông để cơ thể thành đường thẳng. Giữ đầu, vai và hông cùng mặt phẳng.',
    imageUrl: '/exercises/side-plank.png',
  },
  {
    name: 'Bird Dog',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core, lưng dưới, mông, vai',
    equipmentNeeded: 'Thảm tập',
    description:
      'Từ tư thế bốn điểm, duỗi đồng thời tay và chân đối diện trong khi giữ hông vuông. Tạm dừng, kéo về chậm và tránh xoay thân.',
    imageUrl: '/exercises/bird-dog.png',
  },
  {
    name: 'Dead Bug',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core sâu, cơ gấp hông',
    equipmentNeeded: 'Thảm tập',
    description:
      'Nằm ngửa, giữ lưng dưới áp nhẹ sàn rồi hạ tay và chân đối diện. Chỉ đi đến biên độ vẫn kiểm soát được xương chậu và nhịp thở.',
    imageUrl: '/exercises/dead-bug.png',
  },
]

export async function seedExercises(): Promise<void> {
  if ((await prisma.exercise.count()) > 0) return

  const existingNames = new Set(EXERCISE_LIBRARY.map((e) => e.name.toLowerCase()))

  const apiExercises = EXERCISES_FROM_API.filter(
    (e) => !existingNames.has(e.name.toLowerCase())
  ).map((e) => ({
    name: e.name,
    category: e.category as ExerciseCategory,
    muscleGroup: e.muscleGroup,
    equipmentNeeded: e.equipmentNeeded,
    description: e.description,
    imageUrl: e.imageUrl,
    createdByStaffId: null,
    deletedAt: null,
  }))

  const allExercises = [
    ...EXERCISE_LIBRARY.map((e) => ({ ...e, createdByStaffId: null, deletedAt: null })),
    ...apiExercises,
  ]
  await prisma.exercise.createMany({ data: allExercises })
  console.log(
    `[seed] seeded ${allExercises.length} exercises (${EXERCISE_LIBRARY.length} library + ${apiExercises.length} from API cache)`
  )
}
