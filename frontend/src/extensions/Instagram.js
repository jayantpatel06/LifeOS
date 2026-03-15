import { Node, mergeAttributes } from '@tiptap/core';

// Extract Instagram post/reel ID from URL
const getInstagramId = (url) => {
  const patterns = [
    /instagram\.com\/(?:[^/]+\/)?p\/([^/?#&]+)/,
    /instagram\.com\/(?:[^/]+\/)?reel\/([^/?#&]+)/,
    /instagram\.com\/(?:[^/]+\/)?reels\/([^/?#&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { id: match[1], isReel: url.includes('/reel') || url.includes('/reels') };
    }
  }
  return null;
};

// Check if URL is an Instagram URL
const isInstagramUrl = (url) => {
  return /instagram\.com\/(?:[^/]+\/)?(p|reel|reels)\//.test(url);
};

const Instagram = Node.create({
  name: 'instagram',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      width: 400,
      height: 500,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      postId: { default: null },
      isReel: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-instagram-embed]',
        getAttrs: (element) => ({
          src: element.getAttribute('data-src'),
          postId: element.getAttribute('data-post-id'),
          isReel: element.getAttribute('data-is-reel') === 'true',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, postId, isReel, ...rest } = HTMLAttributes;
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/`;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, rest, {
        'data-instagram-embed': '',
        'data-src': src,
        'data-post-id': postId,
        'data-is-reel': isReel,
        'class': 'instagram-embed my-4 flex justify-center',
      }),
      [
        'iframe',
        {
          src: embedUrl,
          width: this.options.width,
          height: this.options.height,
          frameborder: '0',
          scrolling: 'no',
          allowtransparency: 'true',
          allowfullscreen: 'true',
          class: 'rounded-xl shadow-neu-sm bg-muted/10'
        },
      ],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const { postId } = node.attrs;
      const embedUrl = `https://www.instagram.com/p/${postId}/embed/`;

      const wrapper = document.createElement('div');
      wrapper.classList.add('instagram-embed', 'my-4', 'flex', 'justify-center');
      wrapper.setAttribute('data-instagram-embed', '');
      wrapper.contentEditable = 'false';

      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.width = String(this.options.width);
      iframe.height = String(this.options.height);
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      iframe.allowFullscreen = true;
      iframe.classList.add('rounded-xl', 'shadow-neu-sm', 'bg-muted/10');

      wrapper.appendChild(iframe);

      return { dom: wrapper };
    };
  },

  addCommands() {
    return {
      setInstagramPost: (options) => ({ commands }) => {
        const result = getInstagramId(options.src);
        if (!result) {
          return false;
        }

        return commands.insertContent({
          type: this.name,
          attrs: {
            src: options.src,
            postId: result.id,
            isReel: result.isReel,
          },
        });
      },
    };
  },
});

export default Instagram;
export { isInstagramUrl, getInstagramId };
