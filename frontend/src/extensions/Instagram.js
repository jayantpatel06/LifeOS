import { Node, mergeAttributes } from '@tiptap/core';

// Extract Instagram post/reel ID from URL
const getInstagramId = (url) => {
  const patterns = [
    /instagram\.com\/p\/([^/?#&]+)/,
    /instagram\.com\/reel\/([^/?#&]+)/,
    /instagram\.com\/reels\/([^/?#&]+)/,
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
  return /instagram\.com\/(p|reel|reels)\//.test(url);
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
      src: {
        default: null,
      },
      postId: {
        default: null,
      },
      isReel: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-instagram-embed]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const postId = HTMLAttributes.postId;
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/`;

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-instagram-embed': '',
        'class': 'instagram-embed',
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
        },
      ],
    ];
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
