import OpenAI from 'openai';
import { embedText } from '@/services/knowledge/embedder';
import { search } from '@/services/knowledge/mongo';

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a multi-persona Caroma expert. You act seamlessly as a Customer Support Agent (CSA), Plumber, Store Stylist, and Sales Consultant. A customer is talking to you. Your job is to guide them through a COMPLETE end-to-end journey.

## Your Conversational Style
- Human-like, warm, and highly knowledgeable. Do not talk like a generic bot.
- You must hold a step-by-step conversation. Do NOT just give a one-shot answer and dump everything at once.
- NEVER invent or hallucinate products, prices, specifications, or design rules. ONLY use data retrieved from the \`searchKnowledge\` tool.
- If they ask for design help, search for "design brochure" or "bathroom design" in the knowledge base first.
- End your responses with a human-like follow-up question.

## The End-to-End Journey (Follow this strictly)

### Phase 1: Understand & Troubleshoot
- **MUST call \`setPhase\` with "clarify"** on your first response to render clarifying questions on the right panel.
- Act like a plumber or stylist to understand their actual problem or design vision.
- **CRITICAL:** Do NOT list the questions or options in your chat message text. The UI renders them on the right. Keep your chat message conversational, e.g. "I've got a few questions on the right to help me understand your needs."
- Search the knowledge base for troubleshooting guides or design rules. Do NOT guess.

### Phase 2: Product Recommendation
- Search the knowledge base for matching products.
- **CRITICAL:** DO NOT call 'setPhase("clarify")' more than once. Once the user provides their answers, you MUST transition to recommending products.
- **CRITICAL:** Whenever you recommend products or collections (e.g., Liano, Urbane), you MUST call the "showProducts" tool to render them visually on the right panel. Do NOT just output a text list of products or links in the chat bubble.
- In chat, act like a Sales/Stylist persona: explain EXACTLY WHY this product is the best fit. **CRITICAL:** You must brief the user on the product's style, look, and any customer feedback or reviews you found in the knowledge base.

### Phase 3: Installation & Preparation Guidance
- Do NOT skip Phase 2. You must show the products visually first before discussing installation.
- ONCE the user is happy with the products and is ready to install, OR if their initial request was purely troubleshooting an existing plumbing issue, transition to the Plumber persona.
- Search for the product's installation manual or troubleshooting guide.
- **CRITICAL:** Explicitly explain the warranty and guarantee in the chat.
- **CRITICAL:** Ask the user: "Do you need a plumber for this, or are you planning a DIY installation?"
- **CRITICAL:** Do NOT list the troubleshooting or installation steps in your chat message text. You MUST call the "showGuide" tool to render them as an interactive checklist on the right panel.

### Phase 4: Comprehensive Job Quote
- When the customer is fully ready, create the final Job Profile.
- Call \`updateQuote\` (which transitions to the 'quote' phase) and include:
  - A generated \`jobId\` (e.g. "JOB-2938")
  - ALL primary products and required accessories/sealants
  - A comprehensive \`installationSummary\` based on the manuals
  - A \`warrantySummary\` (guarantee, compliance, dimensions)

## CRITICAL RULES
1. **NO HALLUCINATIONS FOR PRODUCTS:** Every product, price, and spec must come from \`searchKnowledge\`.
2. **GENERIC TROUBLESHOOTING ALLOWED:** If you cannot find a specific troubleshooting guide in the knowledge base, you MAY use your general plumbing knowledge to generate generic troubleshooting or installation steps. ALWAYS call \`showGuide\` to display them. 
3. **USE IMAGES:** If you have an imageUrl from the knowledge base, provide it in the tools.
4. **DO NOT SKIP STEPS:** You must do Phase 3 (Installation Guidance) BEFORE generating the quote.
5. **ALWAYS call \`searchKnowledge\`** before answering a technical, design, or product question.`;


const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'searchKnowledge',
      description: 'Search the Caroma knowledge base for products, troubleshooting guides, design inspiration, collections, installation info, or any other Caroma content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query' },
          type: { type: 'string', enum: ['product', 'troubleshooting', 'design', 'collection', 'installation', 'faq', 'general'], description: 'Optional filter by content type' },
          category: { type: 'string', description: 'Optional filter by category (Basins, Showers, Tapware, Toilet Suites, Baths, Accessories)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'setPhase',
      description: 'Update the UI phase. When transitioning to "clarify", you MUST provide dynamic questions tailored to the user\'s context. These questions will render on the right panel.',
      parameters: {
        type: 'object',
        properties: {
          phase: { type: 'string', enum: ['intro', 'clarify', 'validating', 'products', 'quote', 'ordered'] },
          questions: {
            type: 'array',
            description: 'Dynamic clarification questions to show on the right panel. Required when phase is "clarify".',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique ID for this question (e.g. "scope", "finish", "shower_type")' },
                title: { type: 'string', description: 'The question text shown to the user' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'The selectable answer options (2-5 options)'
                }
              },
              required: ['id', 'title', 'options']
            }
          }
        },
        required: ['phase']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateQuote',
      description: 'Update the Bill of Materials (quote) with real product data. Create a full Job Profile including installation guidelines and warranties.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the quote (e.g. "Your Liano II Shower Setup")' },
          jobId: { type: 'string', description: 'A generated unique Job ID (e.g. "JOB-2938")' },
          installationSummary: { type: 'string', description: 'Detailed installation instructions, what to remove, sealants needed, etc.' },
          warrantySummary: { type: 'string', description: 'Warranty, guarantee, dimensions, and compliance information' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string', description: 'The product SKU' },
                name: { type: 'string', description: 'Product name' },
                price: { type: 'number', description: 'Product RRP price in AUD' },
                quantity: { type: 'number', default: 1 },
                imageUrl: { type: 'string', description: 'Product image URL from caroma.com.au' },
                category: { type: 'string', description: 'Product category (Showers, Tapware, Basins, etc.)' },
                reason: { type: 'string', description: 'Why this item is included' },
                required: { type: 'boolean', default: false, description: 'Whether this is a mandatory component' }
              },
              required: ['sku', 'name', 'price']
            }
          }
        },
        required: ['title', 'items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showProducts',
      description: 'Show product recommendation cards on the right panel. Use this AFTER searchKnowledge to present products to the user for review BEFORE building the final quote.',
      parameters: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Product name' },
                sku: { type: 'string', description: 'Product SKU' },
                price: { type: 'number', description: 'Price in AUD' },
                imageUrl: { type: 'string', description: 'Product image URL' },
                category: { type: 'string', description: 'Product category (Shower Head, Mixer, In-wall Body, Basin, etc.)' },
                collection: { type: 'string', description: 'Caroma collection name (Liano II, Urbane II, etc.)' },
                description: { type: 'string', description: 'A 1-2 sentence explanation of WHY this product fits the user\'s brief' },
                features: { type: 'array', items: { type: 'string' }, description: '2-3 key features or benefits' },
                finishes: { type: 'array', items: { type: 'string' }, description: 'Available finishes' },
                specs: {
                  type: 'object',
                  description: 'Technical specifications as key-value pairs. Include: Material, WELS Rating, Flow Rate, Dimensions, Warranty, Installation Type, etc. CRITICAL: Do NOT guess or hallucinate any specs (especially Warranty). If it is not explicitly stated in the knowledge base, omit it.',
                  additionalProperties: { type: 'string' }
                },
                url: { type: 'string', description: 'Product page URL from caroma.com.au' },
                accessories: {
                  type: 'array',
                  description: 'Optional matching accessories (e.g. Robe Hook, Towel Rail). You MUST proactively suggest 1-2 accessories from the catalog that match the style, even if they are not explicitly linked in the product markdown.',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      sku: { type: 'string' },
                      price: { type: 'number' }
                    },
                    required: ['name']
                  }
                },
                installationParts: {
                  type: 'array',
                  description: 'Mandatory parts required for installation (e.g. In-wall body, Connector). You MUST proactively suggest at least 1 installation part if applicable.',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      sku: { type: 'string' },
                      price: { type: 'number' },
                      required: { type: 'boolean', description: 'True if this part is mandatory for installation' }
                    },
                    required: ['name']
                  }
                }
              },
              required: ['name', 'description']
            }
          }
        },
        required: ['products']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showGuide',
      description: 'Show an interactive troubleshooting or installation guide on the right panel. Use this for step-by-step instructions (e.g. diagnosing a leak, installing a product).',
      parameters: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for the step (e.g., "step-1")' },
                title: { type: 'string', description: 'Short title for the step (e.g., "Turn Off Water Supply")' },
                description: { type: 'string', description: 'Detailed explanation of what to do.' }
              },
              required: ['id', 'title', 'description']
            }
          }
        },
        required: ['steps']
      }
    }
  }
];

export async function POST(req: Request) {
  const { messages } = await req.json();

  const conversation: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  const maxLoops = 8; // Allow enough loops for multiple search + UI tool calls
  let loops = 0;
  let finalMessage: any = null;
  const uiToolCalls: any[] = []; // Collect UI tool calls to return to frontend

  try {
    while (loops < maxLoops) {
    loops++;
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: conversation,
      tools,
      tool_choice: 'auto'
    });

    const msg = response.choices[0].message;
    finalMessage = msg;
    conversation.push(msg);

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      let requiresAnotherCall = false;

      for (const call of msg.tool_calls) {
        if (call.type !== 'function') continue;

        if (call.function.name === 'searchKnowledge') {
          // Execute server-side — search MongoDB
          try {
            const args = JSON.parse(call.function.arguments);
            
            // Try to get embedding, but don't fail if it doesn't work
            let queryEmbedding: number[] | null = null;
            try {
              queryEmbedding = await embedText(args.query);
            } catch (embedErr) {
              console.warn('Embedding failed, using regex search:', embedErr);
            }
            
            const results = await search(queryEmbedding, {
              query: args.query,
              brand: 'caroma',
              type: args.type,
              category: args.category,
              limit: 8,
            });

            let toolResult;
            if (results.length === 0) {
              toolResult = { found: false, message: 'No relevant documents found for this query. Try a broader search.' };
            } else {
              toolResult = {
                found: true,
                resultCount: results.length,
                results: results.map(r => ({
                  title: r.document.title,
                  type: r.document.metadata?.type,
                  sku: r.document.metadata?.sku,
                  price: r.document.metadata?.price,
                  collection: r.document.metadata?.collection,
                  finishes: r.document.metadata?.finishes,
                  url: r.document.metadata?.url || r.document.sourceUrl,
                  content: r.document.chunk.slice(0, 2500) // Give AI more context
                }))
              };
            }

            conversation.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(toolResult)
            });
            requiresAnotherCall = true;

          } catch (err) {
            console.error('Knowledge search error:', err);
            conversation.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ found: false, message: 'Knowledge search failed.' })
            });
            requiresAnotherCall = true;
          }

        } else if (call.function.name === 'setPhase' || call.function.name === 'updateQuote' || call.function.name === 'showProducts' || call.function.name === 'showGuide') {
          // UI tool calls — collect them, provide a dummy response to OpenAI, and continue
          uiToolCalls.push(call);
          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ success: true })
          });
          // After UI tools, let the AI generate a text response explaining what happened
          requiresAnotherCall = true;
        }
      }

      if (!requiresAnotherCall) {
        break;
      }
    } else {
      // No tools called — we have a final text response
      break;
    }
  }

    // Return both the final message text AND any UI tool calls
    return new Response(JSON.stringify({
      message: finalMessage,
      uiActions: uiToolCalls.map(call => ({
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments)
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred during AI processing.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
