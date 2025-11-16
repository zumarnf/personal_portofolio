import { Mail, Phone, MapPin } from 'lucide-react'

export default function Contact() {
  const contactInfo = [
    {
      icon: Phone,
      label: 'Phone',
      value: '+6283847122467',
      href: 'tel:+6283847122467',
    },
    {
      icon: Mail,
      label: 'Email',
      value: 'zumarnf29@gmail.com',
      href: 'mailto:zumarnf29@gmail.com',
    },
    {
      icon: MapPin,
      label: 'Location',
      value: 'Gresik, East Java',
      href: '#',
    },
  ]

  return (
    <section id="contact" className="md:ml-64 px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Get In Touch</h2>
          <div className="w-12 h-1 bg-accent rounded-full"></div>
        </div>

        <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-2xl">
          I'm always interested in hearing about new projects and opportunities. Whether you have a question or just want to say hello, feel free to reach out!
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {contactInfo.map((info, index) => {
            const Icon = info.icon
            return (
              <a
                key={index}
                href={info.href}
                className="flex flex-col items-start p-6 bg-card border border-border rounded-lg hover:border-accent transition-all duration-300 group"
              >
                <Icon className="w-6 h-6 text-accent mb-3" />
                <p className="text-sm text-muted-foreground mb-2">{info.label}</p>
                <p className="text-foreground font-semibold group-hover:text-accent transition-colors">
                  {info.value}
                </p>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
