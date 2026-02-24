import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What is Nameless?',
    answer:
      'Nameless is a brand offering high-quality Roblox externals and tools. Our products focus on advanced features, reliability, and user safety. Each product has unique capabilities - check individual product pages for specific features.',
  },
  {
    question: 'Will I get banned using your products?',
    answer:
      'Using any third-party software in Roblox violates their Terms of Service and may result in a ban. Our products are designed with anti-detection in mind to minimize risk, but we cannot guarantee you won\'t be banned. Use at your own risk. Game bans are not eligible for refunds.',
  },
  {
    question: 'What is the usage-based time system?',
    answer:
      'Our products use a unique usage-based time system. Unlike traditional licenses that expire after X days regardless of use, time only counts when the software is actively running. For example, a "1 day" license gives you 24 hours of actual usage time. Close the software and your time stops counting.',
  },
  {
    question: 'Do your products work with all Roblox games?',
    answer:
      'No product is guaranteed to work with every Roblox game. Game updates and anti-cheat systems may break compatibility. If you report a game that doesn\'t work, we\'ll compensate you with 50 minutes of extra time. For verified bugs, you get 2 hours of extra time. No refunds are issued.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept PayPal for regular purchases. Resellers can use PayPal or cryptocurrency (BTC/ETH/USDT). Other payment methods may be available - contact us on Discord to confirm.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'No. All sales are final with no refunds under any circumstances. This is a digital product delivered instantly. If you experience technical issues, contact support for time compensation (2 hours for bugs, 50 minutes for game incompatibility). Chargebacks result in permanent account termination.',
  },
  {
    question: 'What features are included?',
    answer:
      'Features vary by product. Generally, our products include advanced aimbots, feature-rich ESP, customization options, and anti-detection systems. Visit individual product pages for specific feature lists. We focus on quality over quantity - every feature is tested and reliable.',
  },
  {
    question: 'Can I use products on multiple computers?',
    answer:
      'Each license is tied to one HWID (hardware ID). If you change computers or hardware, you\'ll need an HWID reset. Resellers get free HWID resets (3 per $50 spent). Regular customers can request resets through support.',
  },
  {
    question: 'How long does support take to respond?',
    answer:
      'We aim to respond within 24-72 hours. Priority support is available for resellers. Join our Discord for the fastest responses from both staff and community.',
  },
  {
    question: 'What happens if I file a chargeback?',
    answer:
      'Filing a chargeback or payment dispute will result in: immediate license termination for ALL products, permanent account suspension, blacklisting from all Nameless services, and IP/HWID ban. You must contact support BEFORE filing any payment disputes. This is in our Terms of Service.',
  },
  {
    question: 'Can I become a reseller?',
    answer:
      'Yes! Our reseller program offers 50% wholesale discounts, free HWID resets, volume bonuses, and no monthly quotas. Minimum first order is $50. Pricing varies by product. Visit our Reseller page or join Discord to apply.',
  },
  {
    question: 'Do you have more products coming?',
    answer:
      'Yes! We regularly release new products and updates. Follow our Discord for announcements about new releases, updates, and features. Current and future products are covered under the same Terms of Service and refund policy.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-400">Everything you need to know</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-white/10 bg-white/5 overflow-hidden hover:bg-white/10 transition-all"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="font-semibold text-lg text-left text-white">
                  {faq.question}
                </h3>
                <ChevronDown
                  size={20}
                  className={`flex-shrink-0 text-cyan-400 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openIndex === index && (
                <div className="px-6 pb-4 border-t border-white/10 pt-4">
                  <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
          <h3 className="font-semibold text-white mb-2">Still have questions?</h3>
          <p className="text-gray-400 mb-4">
            Join our Discord community or contact support for help.
          </p>
          <a
            href="https://discord.gg/jx8W5rfkWm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold transition-all text-sm"
          >
            Join Discord
          </a>
        </div>
      </div>
    </div>
  );
}
