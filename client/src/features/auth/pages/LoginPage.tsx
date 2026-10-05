import {
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleFilled,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router';
import { useLogin } from '../hooks/useLogin';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

function LoginPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { isLoading, submitLogin } = useLogin();
  const navigate = useNavigate();

  const onFinish = async (values: LoginFormValues) => {
    try {
      const session = await submitLogin(values.username, values.password);
      messageApi.success(`Đăng nhập thành công! Vai trò: ${session.role}`);
      navigate('/dashboard');
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại.',
      );
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8f5] px-4 py-10 sm:px-8">
      {contextHolder}

      <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-brand-green/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-brand-pink/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[15%] top-[12%] h-3 w-3 rounded-full bg-brand-pink" />
      <div className="pointer-events-none absolute bottom-[18%] left-[12%] h-2 w-2 rounded-full bg-brand-green-strong" />

      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_100px_-45px_rgba(26,61,44,0.35)] lg:min-h-[640px] lg:grid-cols-[1.04fr_0.96fr]">
        <aside className="relative hidden overflow-hidden bg-[#e9f8eb] p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 top-32 h-72 w-72 rounded-full border-[42px] border-white/50" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand-green/55" />
          <div className="absolute bottom-20 right-12 h-36 w-36 rounded-full bg-brand-pink/65" />

          <div className="relative z-10 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#376c46] shadow-sm">
              <BankOutlined className="text-xl" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#203d2a]">Học Phí Số</span>
          </div>

          <div className="relative z-10 mb-8 max-w-sm">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#477552]">
              <span className="h-2 w-2 rounded-full bg-[#65b978]" />
              Quản lý học phí thật nhẹ nhàng
            </div>
            <Title level={1} className="!mb-4 !text-[2.65rem] !font-semibold !leading-[1.15] !tracking-tight !text-[#203d2a]">
              Mọi khoản thu,
              <br />
              <span className="text-[#568f60]">trong tầm tay.</span>
            </Title>
            <Text className="!text-base !leading-7 !text-[#607564]">
              Theo dõi học phí, giao dịch và báo cáo trên một nền tảng an toàn, dễ sử dụng.
            </Text>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-[#53705a]">
            <CheckCircleFilled className="text-[#69b87a]" />
            Bảo mật thông tin trong từng giao dịch
          </div>
        </aside>

        <div className="flex items-center px-7 py-10 sm:px-12 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-9 lg:hidden">
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green text-[#315e3d]">
                <BankOutlined className="text-xl" />
              </span>
              <Text className="block text-sm font-semibold text-[#568f60]">HỌC PHÍ SỐ</Text>
            </div>

            <div className="mb-8">
              <Text className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[#74a37a]">
                Chào mừng trở lại
              </Text>
              <Title level={2} className="!mb-2 !text-3xl !font-semibold !tracking-tight !text-[#20352a]">
                Đăng nhập
              </Title>
              <Text className="!text-sm !text-[#7b8980]">
                Nhập thông tin tài khoản để tiếp tục.
              </Text>
            </div>

            <Form
              name="login_form"
              layout="vertical"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              size="large"
              requiredMark={false}
            >
              <Form.Item
                name="username"
                label={<span className="text-sm font-semibold text-[#3c4d41]">Tên đăng nhập</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
              >
                <Input
                  prefix={<UserOutlined className="mr-1 text-[#95a69a]" />}
                  placeholder="Ví dụ: nguyenvana"
                  autoComplete="username"
                  className="!h-12 !rounded-xl !border-[#e8eee8] hover:!border-[#83cd8f] focus:!border-[#83cd8f]"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-sm font-semibold text-[#3c4d41]">Mật khẩu</span>}
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="mr-1 text-[#95a69a]" />}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className="!h-12 !rounded-xl !border-[#e8eee8] hover:!border-[#83cd8f] focus:!border-[#83cd8f]"
                />
              </Form.Item>

              <div className="mb-6 mt-[-4px] flex items-center justify-between">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox className="text-sm text-[#65746a]">Ghi nhớ đăng nhập</Checkbox>
                </Form.Item>
                {/* <a
                  className="text-sm font-semibold text-[#578c60] transition-colors hover:text-[#386c43]"
                  href="mailto:support@hocphiso.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp"
                >
                  Cần hỗ trợ?
                </a> */}
              </div>

              <Form.Item className="!mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  icon={!isLoading && <ArrowRightOutlined />}
                  iconPlacement="end"
                  className="!h-12 w-full !rounded-xl !border-0 !bg-[#ADEBB3] !font-bold !text-[#244b2e] shadow-[0_8px_20px_-8px_rgba(79,157,91,0.65)] transition-all hover:!bg-[#9de3a5] hover:shadow-[0_12px_24px_-8px_rgba(79,157,91,0.7)]"
                >
                  Đăng nhập
                </Button>
              </Form.Item>
            </Form>

            <div className="mt-9 border-t border-[#eef1ed] pt-5 text-center">
              <Text className="!text-xs !leading-5 !text-[#9aa49c]">
                © {new Date().getFullYear()} Học Phí Số
                <span className="mx-2 text-[#d5ddd6]">·</span>
                Kết nối giáo dục, đơn giản hóa thanh toán
              </Text>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
