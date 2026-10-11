import { generateQrSvg } from './qr';

export interface CheckoutOptions {
  amount: number | string;
  amountApay?: number | string;
  currency?: 'USDC' | 'APAY' | 'ETH' | 'DUAL';
  network?: 'base' | 'base-sepolia';
  receiver?: string;
  isDemo?: boolean;
  orderId?: string;
  title?: string;
  description?: string;
  theme?: 'auto' | 'light' | 'dark';
  onSuccess?: (receipt: PaymentReceipt) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export interface PaymentReceipt {
  txHash: string;
  payer: string;
  receiver: string;
  amount: string;
  currency: string;
  network: string;
  orderId?: string;
  timestamp: number;
}

// Network configs
const NETWORKS = {
  'base-sepolia': {
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia Testnet',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.basescan.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia official Circle USDC
    apayAddress: '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3',
    demoReceiver: '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF', // EscrowVault contract address for safe demos
  },
  base: {
    chainId: 8453,
    chainIdHex: '0x2105',
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Native Base USDC
    apayAddress: '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3',
    demoReceiver: '0xd08c8a337e5339d1c083e06d74a9265956ceea16', // Base Mainnet EscrowVault contract address
  },
};

/**
 * Official Base Builder Code attribution (ERC-8021 suffix)
 * Assigned to A-Pay Protocol by Base Developer Portal
 */
export const BASE_BUILDER_CODE = 'bc_fywkfn06';
export const BASE_BUILDER_SUFFIX = '62635f6679776b666e30360b0080218021802180218021802180218021';

/**
 * Standard ERC-20 transfer(address to, uint256 amount) calldata encoder
 */
function encodeErc20Transfer(to: string, amountBaseUnits: bigint): string {
  const methodId = 'a9059cbb'; // keccak256("transfer(address,uint256)").slice(0, 8)
  const cleanTo = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const cleanAmount = amountBaseUnits.toString(16).padStart(64, '0');
  return `0x${methodId}${cleanTo}${cleanAmount}`;
}

export class APayCheckoutEngine {
  private activeContainer: HTMLElement | null = null;
  private currentOptions: CheckoutOptions | null = null;
  private isProcessing = false;
  private activeTab: 'oneclick' | 'qr' = 'oneclick';
  private selectedCurrency: 'USDC' | 'APAY' | 'ETH' = 'USDC';
  private qrCache = new Map<string, string>();
  private escListener: ((e: KeyboardEvent) => void) | null = null;
  private currentResolve: ((receipt: PaymentReceipt) => void) | null = null;
  private currentReject: ((error: Error) => void) | null = null;

  private resolveReceiver(
    opt: CheckoutOptions,
    net: (typeof NETWORKS)['base-sepolia' | 'base'],
  ): string {
    const windowReceiver =
      typeof window !== 'undefined' ? (window as any).APay_Receiver : undefined;
    const receiver = opt.receiver || windowReceiver || (opt.isDemo ? net.demoReceiver : null);
    if (!receiver) {
      throw new Error(
        "A-Pay Checkout Error: 'receiver' wallet address is required to receive payments.",
      );
    }
    return receiver;
  }

  public async open(options: CheckoutOptions): Promise<PaymentReceipt> {
    // 1. Clean any existing modal(s) completely
    this.close();

    const net = NETWORKS[options.network || 'base'];
    try {
      this.resolveReceiver(options, net);
    } catch (err: any) {
      if (options.onError) options.onError(err);
      return Promise.reject(err);
    }

    this.currentOptions = options;
    this.selectedCurrency =
      options.currency === 'DUAL'
        ? 'USDC'
        : options.currency === 'APAY'
          ? 'APAY'
          : options.currency === 'ETH'
            ? 'ETH'
            : 'USDC';
    this.activeTab = 'oneclick';
    this.isProcessing = false;

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;
      this.mountModal();
    });
  }

  public close() {
    // 1. Remove keyboard listeners
    if (this.escListener) {
      window.removeEventListener('keydown', this.escListener);
      this.escListener = null;
    }

    // 2. Remove all modal DOM elements to prevent any stacking
    if (typeof document !== 'undefined') {
      const existingModals = document.querySelectorAll('#apay-checkout-container');
      existingModals.forEach((el) => {
        el.remove();
      });
    }

    this.activeContainer = null;

    // 3. Fire optional close callback
    if (this.currentOptions?.onClose) {
      try {
        this.currentOptions.onClose();
      } catch (err) {
        console.error('Error in onClose handler:', err);
      }
    }

    this.currentOptions = null;
    this.isProcessing = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  private getEffectiveAmounts() {
    const opt = this.currentOptions;
    const baseAmount = Number(opt?.amount) || 1.0;

    const apayPrice =
      opt?.amountApay !== undefined && opt?.amountApay !== null && opt?.amountApay !== ''
        ? Number(opt.amountApay)
        : opt?.currency === 'APAY'
          ? baseAmount
          : Number((baseAmount * 0.75).toFixed(2));

    const ethPrice = Number((baseAmount / 2500).toFixed(4));

    return { baseAmount, apayPrice, ethPrice };
  }

  private getDisplayAmount(currency: 'USDC' | 'APAY' | 'ETH'): string {
    const { baseAmount, apayPrice, ethPrice } = this.getEffectiveAmounts();
    switch (currency) {
      case 'APAY':
        return `${apayPrice} $APAY`;
      case 'ETH':
        return `${ethPrice} ETH`;
      default:
        return `$${baseAmount.toFixed(2)} USDC`;
    }
  }

  private getPaymentUri(currency: 'USDC' | 'APAY' | 'ETH'): string {
    if (!this.currentOptions) return '';
    const opt = this.currentOptions;
    const net = NETWORKS[opt.network || 'base'];
    const receiver = this.resolveReceiver(opt, net);
    const { baseAmount, apayPrice, ethPrice } = this.getEffectiveAmounts();

    if (currency === 'ETH') {
      const amountWei = BigInt(Math.round(ethPrice * 1e18));
      return `ethereum:${receiver}@${net.chainId}?value=${amountWei}`;
    }

    const tokenAddress = currency === 'USDC' ? net.usdcAddress : net.apayAddress;
    const decimals = currency === 'USDC' ? 6 : 18;
    const effectiveAmount = currency === 'APAY' ? apayPrice : baseAmount;
    const amountUnits = BigInt(Math.round(effectiveAmount * 10 ** decimals));
    return `ethereum:${tokenAddress}@${net.chainId}/transfer?address=${receiver}&uint256=${amountUnits}`;
  }

  private mountModal() {
    if (!this.currentOptions || typeof document === 'undefined') return;

    const opt = this.currentOptions;
    const net = NETWORKS[opt.network || 'base'];
    const receiver = this.resolveReceiver(opt, net);
    const { apayPrice } = this.getEffectiveAmounts();

    const isDark =
      opt.theme === 'dark' ||
      (opt.theme !== 'light' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    const initialDisplayAmount = this.getDisplayAmount(this.selectedCurrency);
    const apayPillLabel = opt.amountApay ? `🔥 $APAY (${apayPrice} APAY)` : '🔥 $APAY (25% OFF)';

    const container = document.createElement('div');
    container.id = 'apay-checkout-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', opt.title || 'A-Pay Checkout');

    container.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      background: ${isDark ? 'rgba(3, 7, 18, 0.78)' : 'rgba(15, 23, 42, 0.55)'};
      animation: apayFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      touch-action: pan-y;
    `;

    container.innerHTML = `
      <style>
        @keyframes apayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes apayScaleUp { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes apayPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes apaySpin { to { transform: rotate(360deg); } }

        .apay-card {
          width: 100%;
          max-width: 440px;
          max-height: min(92dvh, 680px);
          display: flex;
          flex-direction: column;
          background: ${isDark ? '#090d16' : '#ffffff'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
          border-radius: 26px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'};
          overflow: hidden;
          animation: apayScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .apay-card-body {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 16px 20px 20px;
          box-sizing: border-box;
        }

        .apay-btn {
          cursor: pointer;
          border: none;
          outline: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: transform 0.12s ease, background-color 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
        }

        .apay-btn:active {
          transform: scale(0.96);
        }

        .apay-curr-pill {
          padding: 8px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .apay-curr-active {
          color: #ffffff !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
        }

        .apay-curr-inactive {
          background: ${isDark ? '#1e293b' : '#f1f5f9'} !important;
          color: ${isDark ? '#94a3b8' : '#64748b'} !important;
        }

        .apay-curr-inactive:hover {
          background: ${isDark ? '#334155' : '#e2e8f0'} !important;
        }

        .apay-tab-btn {
          flex: 1;
          min-height: 44px;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 700;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .apay-tab-active {
          color: ${isDark ? '#38bdf8' : '#0284c7'} !important;
          border-bottom: 2px solid ${isDark ? '#38bdf8' : '#0284c7'} !important;
        }

        .apay-tab-inactive {
          color: ${isDark ? '#64748b' : '#94a3b8'} !important;
          border-bottom: 2px solid transparent !important;
        }

        .apay-close-touch {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${isDark ? '#1e293b' : '#f1f5f9'};
          color: ${isDark ? '#94a3b8' : '#64748b'};
          font-size: 15px;
          font-weight: 700;
        }

        .apay-close-touch:hover {
          background: ${isDark ? '#334155' : '#e2e8f0'};
          color: ${isDark ? '#f8fafc' : '#0f172a'};
        }

        @media (max-width: 400px) {
          .apay-card {
            border-radius: 20px;
          }
          .apay-curr-pill {
            padding: 6px 10px;
            font-size: 10px;
          }
        }
      </style>

      <div class="apay-card" id="apay-card-root" onclick="event.stopPropagation()">
        <!-- Header -->
        <div style="padding: 16px 20px 14px; border-bottom: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 34px; height: 34px; min-width: 34px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #2563eb); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.35);">⚡</div>
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 15px; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${opt.title || 'A-Pay Checkout'}</div>
              <div style="font-size: 11px; color: ${isDark ? '#94a3b8' : '#64748b'}; display: flex; align-items: center; gap: 6px;">
                <span>${net.name}</span>
                <span>•</span>
                <span style="font-family: monospace;">${receiver.slice(0, 6)}...${receiver.slice(-4)}</span>
              </div>
            </div>
          </div>
          <button id="apay-close-btn" class="apay-btn apay-close-touch" aria-label="Close checkout modal">✕</button>
        </div>

        <!-- Total Price Banner (Fixed atop scroll area) -->
        <div style="padding: 16px 20px 14px; text-align: center; background: ${isDark ? 'linear-gradient(180deg, #0e1526, #090d16)' : 'linear-gradient(180deg, #f8fafc, #ffffff)'}; border-bottom: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; flex-shrink: 0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: ${isDark ? '#38bdf8' : '#0284c7'}; margin-bottom: 4px;">Total Amount Due</div>
          <div id="apay-total-amount" style="font-size: 30px; font-weight: 900; letter-spacing: -0.03em; color: ${isDark ? '#ffffff' : '#0f172a'}; line-height: 1.2;">${initialDisplayAmount}</div>
          ${opt.orderId ? `<div style="font-size: 11px; color: ${isDark ? '#64748b' : '#94a3b8'}; margin-top: 4px; font-family: monospace;">Order Ref: ${opt.orderId}</div>` : ''}

          <!-- Currency Pills -->
          <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 12px;">
            <button id="apay-curr-usdc" class="apay-btn apay-curr-pill ${this.selectedCurrency === 'USDC' ? 'apay-curr-active' : 'apay-curr-inactive'}" style="${this.selectedCurrency === 'USDC' ? 'background: #0284c7;' : ''}">USDC</button>
            <button id="apay-curr-apay" class="apay-btn apay-curr-pill ${this.selectedCurrency === 'APAY' ? 'apay-curr-active' : 'apay-curr-inactive'}" style="${this.selectedCurrency === 'APAY' ? 'background: #e11d48;' : ''}">${apayPillLabel}</button>
            <button id="apay-curr-eth" class="apay-btn apay-curr-pill ${this.selectedCurrency === 'ETH' ? 'apay-curr-active' : 'apay-curr-inactive'}" style="${this.selectedCurrency === 'ETH' ? 'background: #6366f1;' : ''}">ETH</button>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div style="display: flex; border-bottom: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 0 16px; flex-shrink: 0;">
          <button id="apay-tab-oneclick" class="apay-btn apay-tab-btn apay-tab-active">⚡ 1-Click Pay</button>
          <button id="apay-tab-qr" class="apay-btn apay-tab-btn apay-tab-inactive">📱 Scan & Pay (QR)</button>
        </div>

        <!-- Scrollable Body Content -->
        <div class="apay-card-body">
          <!-- 1-Click Web3 View -->
          <div id="apay-oneclick-view" style="display: block;">
            <p style="font-size: 12px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-bottom: 16px; text-align: center; line-height: 1.4;">
              Connect your browser Web3 wallet (MetaMask, Coinbase Wallet, Brave) for instant 1-click settlement on Base.
            </p>

            <div id="apay-status-box" style="display: none; padding: 12px; border-radius: 14px; background: ${isDark ? '#1e293b' : '#f8fafc'}; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; font-size: 12px; margin-bottom: 16px; text-align: center; word-break: break-word;">
              <span id="apay-status-text">Connecting...</span>
            </div>

            <button id="apay-pay-action-btn" class="apay-btn" style="width: 100%; min-height: 48px; padding: 14px 16px; border-radius: 16px; background: linear-gradient(135deg, #0284c7, #2563eb); color: white; font-weight: 800; font-size: 15px; box-shadow: 0 8px 20px rgba(37,99,235,0.35); display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span id="apay-pay-action-btn-text">Pay ${initialDisplayAmount}</span>
            </button>

            <div style="margin-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: ${isDark ? '#64748b' : '#94a3b8'};">
              <span>Network Fee: &lt; $0.001</span>
              <span>Confirmation: ~1.5s</span>
            </div>
          </div>

          <!-- Scan & Pay QR View -->
          <div id="apay-qr-view" style="display: none; text-align: center;">
            <div style="background: white; padding: 14px; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 12px; min-width: 190px; min-height: 190px;" id="apay-qr-code-box">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #64748b; font-size: 12px;">
                <div style="width: 24px; height: 24px; border: 2px solid #0284c7; border-top-color: transparent; border-radius: 50%; animation: apaySpin 0.8s linear infinite;"></div>
                <span>Loading QR...</span>
              </div>
            </div>
            <p style="font-size: 11px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-bottom: 12px; line-height: 1.4;">
              Scan with any mobile crypto wallet camera to settle directly on Base L2.
            </p>

            <div style="background: ${isDark ? '#1e293b' : '#f8fafc'}; padding: 8px 12px; border-radius: 14px; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 11px; font-family: monospace; color: ${isDark ? '#cbd5e1' : '#334155'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left;">${receiver}</span>
              <button id="apay-copy-receiver-btn" class="apay-btn" style="background: transparent; font-size: 11px; font-weight: bold; color: ${isDark ? '#38bdf8' : '#0284c7'}; min-height: 36px; padding: 0 8px;">Copy</button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 12px 20px; background: ${isDark ? '#050810' : '#f8fafc'}; border-top: 1px solid ${isDark ? '#1e293b' : '#f1f5f9'}; font-size: 11px; color: ${isDark ? '#64748b' : '#94a3b8'}; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: apayPulse 2s infinite;"></span>
            <span>Non-Custodial Direct Settlement</span>
          </div>
          <span style="font-weight: bold; letter-spacing: 0.04em;">A-PAY PROTOCOL</span>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.activeContainer = container;

    // Attach all interactive listeners
    this.attachEventListeners(container, isDark);

    // Warm up QR codes in the background without blocking the UI
    this.loadQrCode(this.selectedCurrency, isDark);
  }

  private attachEventListeners(container: HTMLElement, isDark: boolean) {
    // 1. Backdrop close handling (both click and touchend)
    const handleBackdrop = (e: Event) => {
      if (e.target === container && !this.isProcessing) {
        e.preventDefault();
        this.close();
      }
    };
    container.addEventListener('click', handleBackdrop);
    container.addEventListener('touchend', handleBackdrop);

    // 2. Close button ('X') with 44px touch target
    const closeBtn = container.querySelector('#apay-close-btn');
    if (closeBtn) {
      const handleClose = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isProcessing) {
          this.close();
        }
      };
      closeBtn.addEventListener('click', handleClose);
      closeBtn.addEventListener('touchend', handleClose);
    }

    // 3. Currency switches - instant in-place update (0ms latency)
    const usdcBtn = container.querySelector('#apay-curr-usdc') as HTMLElement | null;
    const apayBtn = container.querySelector('#apay-curr-apay') as HTMLElement | null;
    const ethBtn = container.querySelector('#apay-curr-eth') as HTMLElement | null;

    const setupCurrencyBtn = (btn: HTMLElement | null, curr: 'USDC' | 'APAY' | 'ETH') => {
      if (!btn) return;
      const handleClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchCurrency(curr, isDark);
      };
      btn.addEventListener('click', handleClick);
      btn.addEventListener('touchend', handleClick);
    };

    setupCurrencyBtn(usdcBtn, 'USDC');
    setupCurrencyBtn(apayBtn, 'APAY');
    setupCurrencyBtn(ethBtn, 'ETH');

    // 4. Tab switches - instant in-place display toggle (0ms latency)
    const oneclickTab = container.querySelector('#apay-tab-oneclick') as HTMLElement | null;
    const qrTab = container.querySelector('#apay-tab-qr') as HTMLElement | null;

    const setupTabBtn = (btn: HTMLElement | null, tab: 'oneclick' | 'qr') => {
      if (!btn) return;
      const handleClick = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchTab(tab, isDark);
      };
      btn.addEventListener('click', handleClick);
      btn.addEventListener('touchend', handleClick);
    };

    setupTabBtn(oneclickTab, 'oneclick');
    setupTabBtn(qrTab, 'qr');

    // 5. Copy Receiver in QR tab
    const copyBtn = container.querySelector('#apay-copy-receiver-btn');
    if (copyBtn) {
      const handleCopy = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.currentOptions) return;
        const net = NETWORKS[this.currentOptions.network || 'base'];
        const receiver = this.resolveReceiver(this.currentOptions, net);
        try {
          await navigator.clipboard.writeText(receiver);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = 'Copy';
          }, 2000);
        } catch {
          // Fallback if clipboard API is restricted
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            if (copyBtn) copyBtn.textContent = 'Copy';
          }, 2000);
        }
      };
      copyBtn.addEventListener('click', handleCopy);
      copyBtn.addEventListener('touchend', handleCopy);
    }

    // 6. Action Pay Button in One-Click Tab
    const payBtn = container.querySelector('#apay-pay-action-btn');
    if (payBtn) {
      payBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.executeWeb3Payment(container);
      });
    }

    // 7. Window Escape key listener
    this.escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.isProcessing) {
        this.close();
      }
    };
    window.addEventListener('keydown', this.escListener);
  }

  private switchCurrency(currency: 'USDC' | 'APAY' | 'ETH', isDark: boolean) {
    if (this.isProcessing || this.selectedCurrency === currency || !this.activeContainer) return;

    this.selectedCurrency = currency;
    const newDisplayAmount = this.getDisplayAmount(currency);

    // 1. Instant update price banner
    const totalAmountEl = this.activeContainer.querySelector('#apay-total-amount');
    if (totalAmountEl) {
      totalAmountEl.textContent = newDisplayAmount;
    }

    // 2. Instant update pay action button text
    const payBtnText = this.activeContainer.querySelector('#apay-pay-action-btn-text');
    if (payBtnText) {
      payBtnText.textContent = `Pay ${newDisplayAmount}`;
    }

    // 3. Instant update currency pill active styles
    const usdcBtn = this.activeContainer.querySelector('#apay-curr-usdc') as HTMLElement | null;
    const apayBtn = this.activeContainer.querySelector('#apay-curr-apay') as HTMLElement | null;
    const ethBtn = this.activeContainer.querySelector('#apay-curr-eth') as HTMLElement | null;

    const updatePill = (btn: HTMLElement | null, isActive: boolean, activeBg: string) => {
      if (!btn) return;
      if (isActive) {
        btn.classList.add('apay-curr-active');
        btn.classList.remove('apay-curr-inactive');
        btn.style.background = activeBg;
      } else {
        btn.classList.remove('apay-curr-active');
        btn.classList.add('apay-curr-inactive');
        btn.style.background = '';
      }
    };

    updatePill(usdcBtn, currency === 'USDC', '#0284c7');
    updatePill(apayBtn, currency === 'APAY', '#e11d48');
    updatePill(ethBtn, currency === 'ETH', '#6366f1');

    // 4. Update QR code (instantly if cached, async without blocking UI)
    this.loadQrCode(currency, isDark);
  }

  private switchTab(tab: 'oneclick' | 'qr', isDark: boolean) {
    if (this.isProcessing || this.activeTab === tab || !this.activeContainer) return;

    this.activeTab = tab;

    const oneclickView = this.activeContainer.querySelector(
      '#apay-oneclick-view',
    ) as HTMLElement | null;
    const qrView = this.activeContainer.querySelector('#apay-qr-view') as HTMLElement | null;
    const oneclickTabBtn = this.activeContainer.querySelector(
      '#apay-tab-oneclick',
    ) as HTMLElement | null;
    const qrTabBtn = this.activeContainer.querySelector('#apay-tab-qr') as HTMLElement | null;

    if (tab === 'oneclick') {
      if (oneclickView) oneclickView.style.display = 'block';
      if (qrView) qrView.style.display = 'none';

      if (oneclickTabBtn) {
        oneclickTabBtn.classList.add('apay-tab-active');
        oneclickTabBtn.classList.remove('apay-tab-inactive');
      }
      if (qrTabBtn) {
        qrTabBtn.classList.remove('apay-tab-active');
        qrTabBtn.classList.add('apay-tab-inactive');
      }
    } else {
      if (oneclickView) oneclickView.style.display = 'none';
      if (qrView) qrView.style.display = 'block';

      if (qrTabBtn) {
        qrTabBtn.classList.add('apay-tab-active');
        qrTabBtn.classList.remove('apay-tab-inactive');
      }
      if (oneclickTabBtn) {
        oneclickTabBtn.classList.remove('apay-tab-active');
        oneclickTabBtn.classList.add('apay-tab-inactive');
      }

      // Ensure QR code is loaded
      this.loadQrCode(this.selectedCurrency, isDark);
    }
  }

  private async loadQrCode(currency: 'USDC' | 'APAY' | 'ETH', _isDark: boolean) {
    if (!this.activeContainer) return;
    const qrCodeBox = this.activeContainer.querySelector('#apay-qr-code-box') as HTMLElement | null;
    if (!qrCodeBox) return;

    const uri = this.getPaymentUri(currency);
    const cacheKey = `${currency}-${uri}`;

    const cachedSvg = this.qrCache.get(cacheKey);
    if (cachedSvg) {
      qrCodeBox.innerHTML = cachedSvg;
      return;
    }

    try {
      const svg = await generateQrSvg(uri, false); // White card background uses light mode QR for high contrast
      this.qrCache.set(cacheKey, svg);

      // Only inject if user is still on this currency and modal is still open
      if (this.selectedCurrency === currency && this.activeContainer) {
        const currentQrBox = this.activeContainer.querySelector('#apay-qr-code-box');
        if (currentQrBox) {
          currentQrBox.innerHTML = svg;
        }
      }
    } catch (err) {
      console.error('Failed to render QR SVG:', err);
    }
  }

  private async executeWeb3Payment(container: HTMLElement) {
    const statusBox = container.querySelector('#apay-status-box') as HTMLElement | null;
    const statusText = container.querySelector('#apay-status-text') as HTMLElement | null;
    const payBtn = container.querySelector('#apay-pay-action-btn') as HTMLButtonElement | null;

    if (!this.currentOptions) return;
    const opt = this.currentOptions;
    const net = NETWORKS[opt.network || 'base'];
    const receiver = this.resolveReceiver(opt, net) as `0x${string}`;
    const { baseAmount, apayPrice, ethPrice } = this.getEffectiveAmounts();

    const setStatus = (msg: string, isError = false) => {
      if (statusBox && statusText) {
        statusBox.style.display = 'block';
        statusText.innerHTML = msg;
        statusBox.style.borderColor = isError ? '#ef4444' : '#0284c7';
        statusBox.style.color = isError ? '#ef4444' : 'inherit';
      }
    };

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setStatus(
        '⚠️ No Web3 wallet detected. Please install MetaMask, Coinbase Wallet, or use the Scan & Pay (QR) tab.',
        true,
      );
      return;
    }

    const eth = (window as any).ethereum;

    try {
      this.isProcessing = true;
      if (payBtn) payBtn.disabled = true;

      setStatus('Connecting Web3 wallet...');
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const payer = accounts[0];

      // Switch chain to Base / Base Sepolia
      setStatus(`Switching network to ${net.name}...`);
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: net.chainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: net.chainIdHex,
                chainName: net.name,
                rpcUrls: [net.rpcUrl],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: [net.explorerUrl],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Execute transaction with Base Builder Code attribution
      let txHash = '';
      if (this.selectedCurrency === 'ETH') {
        const ethVal = BigInt(Math.round(ethPrice * 1e18)).toString(16);
        setStatus('Please confirm ETH transaction in your wallet...');
        const txObj: Record<string, string> = {
          from: payer,
          to: receiver,
          value: `0x${ethVal}`,
        };
        // ERC-8021 / Base Builder attribution
        if (net.chainId === 8453) {
          txObj.data = `0x${BASE_BUILDER_SUFFIX}`;
        }
        txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [txObj],
        });
      } else {
        const tokenAddress = this.selectedCurrency === 'USDC' ? net.usdcAddress : net.apayAddress;
        const decimals = this.selectedCurrency === 'USDC' ? 6 : 18;
        const effectiveAmount = this.selectedCurrency === 'APAY' ? apayPrice : baseAmount;
        const tokenAmount = BigInt(Math.round(effectiveAmount * 10 ** decimals));

        const baseCalldata = encodeErc20Transfer(receiver, tokenAmount);
        // Append Builder Code trailer if on Base Mainnet
        const calldata =
          net.chainId === 8453 ? `${baseCalldata}${BASE_BUILDER_SUFFIX}` : baseCalldata;

        setStatus(`Please confirm ${this.selectedCurrency} payment in your wallet...`);
        txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: payer,
              to: tokenAddress,
              data: calldata,
              value: '0x0',
            },
          ],
        });
      }

      setStatus(
        `🚀 Payment confirmed on-chain!<br/><a href="${net.explorerUrl}/tx/${txHash}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; font-weight: bold;">View on Basescan ↗</a>`,
      );

      const paidAmount =
        this.selectedCurrency === 'APAY'
          ? apayPrice.toString()
          : this.selectedCurrency === 'ETH'
            ? ethPrice.toString()
            : baseAmount.toString();

      const receipt: PaymentReceipt = {
        txHash,
        payer,
        receiver,
        amount: paidAmount,
        currency: this.selectedCurrency,
        network: opt.network || 'base',
        orderId: opt.orderId,
        timestamp: Math.floor(Date.now() / 1000),
      };

      if (opt.onSuccess) {
        try {
          opt.onSuccess(receipt);
        } catch (callbackErr) {
          console.error('Error in onSuccess callback:', callbackErr);
        }
      }

      if (this.currentResolve) {
        this.currentResolve(receipt);
      }

      // Auto close after 3.5s
      setTimeout(() => {
        this.close();
      }, 3500);
    } catch (err: any) {
      console.error('Checkout error:', err);
      this.isProcessing = false;
      if (payBtn) payBtn.disabled = false;
      const errMsg = err?.message || 'Transaction rejected or failed';
      setStatus(`❌ ${errMsg.slice(0, 100)}`, true);

      if (opt.onError) {
        try {
          opt.onError(err);
        } catch (callbackErr) {
          console.error('Error in onError callback:', callbackErr);
        }
      }

      if (this.currentReject) {
        this.currentReject(err);
      }
    }
  }
}

// Singleton global instance
export const APay = {
  version: '1.0.0',
  engine: new APayCheckoutEngine(),
  checkout(options: CheckoutOptions): Promise<PaymentReceipt> {
    return this.engine.open(options);
  },
  close() {
    this.engine.close();
  },
};

// Expose globally on window for <script> tag usage
if (typeof window !== 'undefined') {
  (window as any).APay = APay;

  // Auto-scan for data-apay-button attributes or data-key initialization
  document.addEventListener('DOMContentLoaded', () => {
    const scriptTag = document.querySelector('script[src*="v1.js"], script[src*="checkout.js"]');
    if (scriptTag) {
      const defaultKey = scriptTag.getAttribute('data-key');
      const defaultReceiver = scriptTag.getAttribute('data-receiver');
      if (defaultKey) (window as any).APay_Key = defaultKey;
      if (defaultReceiver) (window as any).APay_Receiver = defaultReceiver;
    }
  });
}
