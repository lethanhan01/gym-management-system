import { Link } from 'react-router-dom'
import HomeNavbar from '@/components/home/HomeNavbar'

export default function ContactPage() {
  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">LIÊN HỆ</h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Gửi yêu cầu để nhận tư vấn về chương trình tập luyện, huấn luyện viên và gói thành viên.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8">
            <form className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="text-sm font-semibold text-white/70">
                  Họ và tên
                </label>
                <input
                  id="contact-name"
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="text-sm font-semibold text-white/70">
                  Số điện thoại
                </label>
                <input
                  id="contact-phone"
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="text-sm font-semibold text-white/70">
                  Nội dung
                </label>
                <textarea
                  id="contact-message"
                  className="mt-2 w-full min-h-32 rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <button type="button" className="rogym-btn rogym-btn--primary rogym-btn--hero w-full">
                <span>GỬI YÊU CẦU</span>
              </button>
              <div className="text-xs text-white/50">
                * Demo UI. Bạn có thể tích hợp API gửi feedback ở vòng sau.
              </div>
            </form>
          </div>

          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8">
            <div className="text-sm font-bold uppercase tracking-widest text-[#42e09e]">
              THÔNG TIN
            </div>
            <div className="mt-4 space-y-4 text-white/70">
              <div>
                <div className="font-semibold text-white">Địa chỉ</div>
                <div>Số 1, Đại Cồ Việt, Bạch Mai, Hà Nội</div>
              </div>
              <div>
                <div className="font-semibold text-white">Hotline</div>
                <div>(+84) 865 797 312</div>
              </div>
              <div>
                <div className="font-semibold text-white">Email</div>
                <div>An.LT235631@sis.hust.edu.vn</div>
              </div>
              <div>
                <div className="font-semibold text-white">Giờ hoạt động</div>
                <div>24/7</div>
              </div>
            </div>
            <div className="mt-10">
              <Link
                to="/member/register"
                className="rogym-btn rogym-btn--wide rogym-btn--outline-white w-full"
              >
                <span>ĐĂNG KÝ THÀNH VIÊN</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
