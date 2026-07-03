from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import asyncio
import random
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET', 'organic-shop-secret-key-change-me-please')
ALGO = 'HS256'
TOKEN_EXP_HOURS = 24 * 7

pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
bearer = HTTPBearer(auto_error=False)

limiter = Limiter(key_func=get_remote_address, default_limits=[])

app = FastAPI()
app.state.limiter = limiter

async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={'detail': 'Too many requests. Please slow down and try again in a moment.'})

app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

# ---------------- Security headers middleware ----------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds industry-standard hardening headers to every response.

    - X-Content-Type-Options: nosniff — blocks MIME sniffing.
    - X-Frame-Options: DENY — prevents clickjacking via iframes.
    - Referrer-Policy: strict-origin-when-cross-origin — limits referrer leakage.
    - Permissions-Policy: disables camera/mic/geolocation for this origin.
    - Strict-Transport-Security: forces HTTPS for 1 year.
    - Cross-Origin-Resource-Policy: same-site — restricts asset embedding.
    - X-Robots-Tag applied only to /api paths (not the SPA) so images
      served from /api can't be indexed and later crawled off-domain.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-site'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        if request.url.path.startswith('/api'):
            response.headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive, nosnippet'
            response.headers['Cache-Control'] = 'no-store'
        return response

app.add_middleware(SecurityHeadersMiddleware)

api = APIRouter(prefix='/api')


# ------------ Models ------------
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None  # base64 data URL

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MessageCreate(BaseModel):
    text: str

class AdminMessageCreate(BaseModel):
    userId: str
    text: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str = 'customer'

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    icon: str
    image: Optional[str] = None

class ProductVariant(BaseModel):
    label: str
    price: float
    oldPrice: Optional[float] = None
    stock: Optional[int] = None

class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: str
    price: float
    oldPrice: Optional[float] = None
    image: str  # URL or base64 data URL
    images: Optional[List[str]] = []
    category: str
    unit: Optional[str] = '1 kg'
    stock: int = 100
    organic: bool = True
    featured: bool = False
    tags: Optional[List[str]] = []
    variants: Optional[List[ProductVariant]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    oldPrice: Optional[float] = None
    image: Optional[str] = None
    images: Optional[List[str]] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock: Optional[int] = None
    organic: Optional[bool] = None
    featured: Optional[bool] = None
    tags: Optional[List[str]] = None
    variants: Optional[List[ProductVariant]] = None

class OrderItem(BaseModel):
    productId: str
    name: str
    image: str
    price: float
    qty: int
    unit: Optional[str] = None
    variant: Optional[str] = None

class Address(BaseModel):
    id: Optional[str] = None
    label: Optional[str] = 'Home'           # Home / Office / Other
    fullName: str
    phone: str
    address: str                            # House / Road / Building
    area: str                               # Area / Thana / Upazila
    city: str = 'Dhaka'
    district: Optional[str] = None
    division: Optional[str] = None
    postalCode: Optional[str] = None
    note: Optional[str] = None
    isDefault: Optional[bool] = False

class AddressCreate(BaseModel):
    label: Optional[str] = 'Home'
    fullName: str
    phone: str
    address: str
    area: str
    city: str = 'Dhaka'
    district: Optional[str] = None
    division: Optional[str] = None
    postalCode: Optional[str] = None
    note: Optional[str] = None
    isDefault: Optional[bool] = False

class AddressUpdate(BaseModel):
    label: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    division: Optional[str] = None
    postalCode: Optional[str] = None
    note: Optional[str] = None
    isDefault: Optional[bool] = None

class OrderCreate(BaseModel):
    items: List[OrderItem]
    address: Address
    paymentMethod: Literal['cod', 'bkash', 'nagad']
    paymentPhone: Optional[str] = None  # sender mobile for bkash/nagad
    paymentTxn: Optional[str] = None    # transaction id entered by user
    subtotal: float
    delivery: float
    total: float
    couponCode: Optional[str] = None
    discount: Optional[float] = 0

class OrderStatusUpdate(BaseModel):
    status: Literal['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

class NotificationCreate(BaseModel):
    title: str
    body: str
    type: str = 'system'
    orderId: Optional[str] = None
    userId: Optional[str] = None  # if None, broadcast to all customers

class CategoryUpsert(BaseModel):
    slug: str
    name: str
    icon: str = 'Leaf'
    image: Optional[str] = None

class PaymentSettings(BaseModel):
    bkashNumber: str = ''
    nagadNumber: str = ''
    bkashType: str = 'personal'  # personal / merchant / agent
    nagadType: str = 'personal'
    instructions: str = ''

class ManualPaymentInfo(BaseModel):
    senderPhone: str
    txnId: str

class PaymentVerifyAdmin(BaseModel):
    status: Literal['paid', 'rejected']
    note: Optional[str] = None

class PaymentInitiate(BaseModel):
    method: Literal['bkash', 'nagad']
    phone: str
    amount: float

class PaymentVerify(BaseModel):
    sessionId: str
    otp: str


class SiteSettings(BaseModel):
    siteName: Optional[str] = 'প্রকৃতির ঘ্রাণ'
    tagline: Optional[str] = 'Farm-fresh organic goodness'
    contactPhone: Optional[str] = ''
    contactEmail: Optional[str] = ''
    contactAddress: Optional[str] = ''
    facebookUrl: Optional[str] = ''
    instagramUrl: Optional[str] = ''
    whatsappNumber: Optional[str] = ''
    deliveryFee: Optional[float] = 60
    freeDeliveryAbove: Optional[float] = 500
    aboutText: Optional[str] = ''
    # Pricing controls (admin-managed)
    globalDiscountPercent: Optional[float] = 0   # blanket % off applied to cart subtotal
    globalDiscountLabel: Optional[str] = ''       # marketing label e.g. "ঈদ ডিসকাউন্ট"
    taxPercent: Optional[float] = 0               # VAT/Tax % applied on (subtotal − discount)
    minOrderAmount: Optional[float] = 0           # minimum order to checkout
    # Branding controls (admin-managed)
    logoUrl: Optional[str] = ''                   # data URL or public path; falls back to /logo.png
    brandColor: Optional[str] = '#047857'         # primary accent color used across UI
    brandColorDark: Optional[str] = '#065f46'     # hover / darker shade
    themeId: Optional[str] = 'emerald'            # preset theme id from THEMES
    # Delivery zones — admin-controlled per-area fees + free zones
    # Each zone: { name: str, fee: float, freeAbove: Optional[float] }
    # Zone matching is done client-side against the customer's typed area (case-insensitive substring).
    # The first matching zone wins; if none matches, `deliveryFee` (global) is used.
    deliveryZones: Optional[List[Dict[str, Any]]] = []
    outsideFee: Optional[float] = 120             # fee for areas that don't match any zone
    # Feature toggles
    showChatWidget: Optional[bool] = True
    showTracker: Optional[bool] = True
    showNewsletter: Optional[bool] = True


class BannerUpsert(BaseModel):
    title: str
    subtitle: Optional[str] = ''
    image: Optional[str] = ''
    ctaLabel: Optional[str] = 'Shop now'
    ctaLink: Optional[str] = '/categories'
    active: bool = True
    order: int = 0


class CouponUpsert(BaseModel):
    code: str
    type: Literal['flat', 'percent'] = 'flat'
    value: float
    minOrder: Optional[float] = 0
    maxDiscount: Optional[float] = None
    active: bool = True
    usageLimit: Optional[int] = None
    expiresAt: Optional[str] = None  # ISO date string


class CouponApply(BaseModel):
    code: str
    subtotal: float


class ReviewCreate(BaseModel):
    productId: str
    rating: int  # 1..5
    text: Optional[str] = ''

class NewsletterSub(BaseModel):
    email: str

class PasswordForgot(BaseModel):
    email: str

class PasswordReset(BaseModel):
    token: str
    newPassword: str


# ------------ Helpers ------------
def hash_password(p: str) -> str: return pwd_ctx.hash(p)
def verify_password(p: str, h: str) -> bool:
    try: return pwd_ctx.verify(p, h)
    except Exception: return False

def create_token(user_id: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXP_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGO)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds: raise HTTPException(401, 'Not authenticated')
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGO])
        user = await db.users.find_one({'id': payload['sub']})
        if not user: raise HTTPException(401, 'User not found')
        return user
    except JWTError:
        raise HTTPException(401, 'Invalid token')

async def get_optional_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    """Returns user dict if a valid token is present, otherwise None.
    Used to support guest checkout while still personalizing for logged-in users."""
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGO])
        user = await db.users.find_one({'id': payload['sub']})
        return user  # could be None if user not found
    except JWTError:
        return None

async def get_admin(user = Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(403, 'Admin access required')
    return user

def slugify(s: str) -> str:
    import re
    s = s.lower().strip()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'[\s-]+', '-', s)
    return s


async def push_notification(user_id: Optional[str], title: str, body: str, n_type: str = 'system', order_id: Optional[str] = None):
    """Create a notification. If user_id is None, broadcast to all customers."""
    if user_id is None:
        users = await db.users.find({'role': 'customer'}, {'id': 1}).to_list(2000)
        ids = [u['id'] for u in users]
    else:
        ids = [user_id]
    docs = [{
        'id': str(uuid.uuid4()),
        'userId': uid,
        'title': title,
        'body': body,
        'type': n_type,
        'orderId': order_id,
        'read': False,
        'createdAt': datetime.utcnow().isoformat(),
    } for uid in ids]
    if docs:
        await db.notifications.insert_many(docs)


# ------------ Routes ------------
@api.get('/')
async def root(): return {'message': 'Organic Shop API'}

# Auth
@api.post('/auth/signup')
@limiter.limit('5/minute')
async def signup(request: Request, body: UserSignup):
    if await db.users.find_one({'email': body.email}):
        raise HTTPException(400, 'Email already registered')
    user = {
        'id': str(uuid.uuid4()),
        'name': body.name,
        'email': body.email,
        'phone': body.phone,
        'password': hash_password(body.password),
        'role': 'customer',
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.users.insert_one(user)
    await push_notification(user['id'], 'স্বাগতম! 🌱', 'প্রকৃতির ঘ্রাণে যোগ দেওয়ার জন্য ধন্যবাদ। আপনার প্রথম অর্ডারে ৳১০০ ছাড় পেতে কোড SOBUJ100 ব্যবহার করুন।', 'system')
    token = create_token(user['id'], 'customer')
    return {'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'phone': user['phone'], 'role': user['role'], 'avatar': user.get('avatar')}}

@api.post('/auth/login')
@limiter.limit('10/minute')
async def login(request: Request, body: UserLogin):
    user = await db.users.find_one({'email': body.email})
    if not user or not verify_password(body.password, user['password']):
        raise HTTPException(401, 'Invalid email or password')
    token = create_token(user['id'], user.get('role', 'customer'))
    return {'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'phone': user['phone'], 'role': user.get('role', 'customer'), 'avatar': user.get('avatar')}}

@api.get('/auth/me')
async def me(user = Depends(get_current_user)):
    return {'id': user['id'], 'name': user['name'], 'email': user['email'], 'phone': user['phone'], 'role': user.get('role', 'customer'), 'avatar': user.get('avatar')}

@api.patch('/auth/me')
async def update_me(body: UserUpdate, user = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({'id': user['id']}, {'$set': update})
    u = await db.users.find_one({'id': user['id']})
    return {'id': u['id'], 'name': u['name'], 'email': u['email'], 'phone': u['phone'], 'role': u.get('role', 'customer'), 'avatar': u.get('avatar')}


# Addresses (per-user address book)
@api.get('/auth/me/addresses')
async def list_addresses(user = Depends(get_current_user)):
    u = await db.users.find_one({'id': user['id']})
    return u.get('addresses', []) or []

@api.post('/auth/me/addresses')
async def add_address(body: AddressCreate, user = Depends(get_current_user)):
    new_addr = body.model_dump()
    new_addr['id'] = str(uuid.uuid4())
    u = await db.users.find_one({'id': user['id']})
    existing = u.get('addresses', []) or []
    # if marked default OR first address — make default & clear other defaults
    if new_addr.get('isDefault') or len(existing) == 0:
        for a in existing: a['isDefault'] = False
        new_addr['isDefault'] = True
    existing.append(new_addr)
    await db.users.update_one({'id': user['id']}, {'$set': {'addresses': existing}})
    return new_addr

@api.put('/auth/me/addresses/{addr_id}')
async def update_address(addr_id: str, body: AddressUpdate, user = Depends(get_current_user)):
    u = await db.users.find_one({'id': user['id']})
    existing = u.get('addresses', []) or []
    target = next((a for a in existing if a.get('id') == addr_id), None)
    if not target: raise HTTPException(404, 'Address not found')
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    target.update(update)
    if update.get('isDefault'):
        for a in existing:
            if a.get('id') != addr_id: a['isDefault'] = False
    await db.users.update_one({'id': user['id']}, {'$set': {'addresses': existing}})
    return target

@api.delete('/auth/me/addresses/{addr_id}')
async def delete_address(addr_id: str, user = Depends(get_current_user)):
    u = await db.users.find_one({'id': user['id']})
    existing = u.get('addresses', []) or []
    target = next((a for a in existing if a.get('id') == addr_id), None)
    if not target: raise HTTPException(404, 'Address not found')
    was_default = target.get('isDefault')
    existing = [a for a in existing if a.get('id') != addr_id]
    # promote first remaining as default if needed
    if was_default and existing: existing[0]['isDefault'] = True
    await db.users.update_one({'id': user['id']}, {'$set': {'addresses': existing}})
    return {'ok': True}


# Messages (chat between customer & admin)
@api.get('/messages')
async def my_messages(user = Depends(get_current_user)):
    msgs = await db.messages.find({'userId': user['id']}).sort('createdAt', 1).to_list(500)
    for m in msgs: m.pop('_id', None)
    # mark admin messages as read by this user
    await db.messages.update_many({'userId': user['id'], 'fromAdmin': True, 'read': False}, {'$set': {'read': True}})
    return msgs

@api.get('/messages/unread-count')
async def my_unread(user = Depends(get_current_user)):
    c = await db.messages.count_documents({'userId': user['id'], 'fromAdmin': True, 'read': False})
    return {'count': c}

@api.post('/messages')
async def send_message(body: MessageCreate, user = Depends(get_current_user)):
    if not body.text or not body.text.strip():
        raise HTTPException(400, 'Empty message')
    msg = {
        'id': str(uuid.uuid4()),
        'userId': user['id'],
        'userName': user['name'],
        'text': body.text.strip()[:2000],
        'fromAdmin': False,
        'read': False,
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.messages.insert_one(msg)
    msg.pop('_id', None)
    return msg

@api.get('/admin/messages/threads')
async def admin_threads(admin = Depends(get_admin)):
    """List one entry per customer with last message + unread count for admin."""
    pipeline = [
        {'$sort': {'createdAt': -1}},
        {'$group': {
            '_id': '$userId',
            'lastMessage': {'$first': '$$ROOT'},
            'count': {'$sum': 1},
            'unread': {'$sum': {'$cond': [{'$and': [{'$eq': ['$fromAdmin', False]}, {'$eq': ['$read', False]}]}, 1, 0]}},
        }},
        {'$sort': {'lastMessage.createdAt': -1}},
    ]
    out = []
    async for d in db.messages.aggregate(pipeline):
        lm = d['lastMessage']; lm.pop('_id', None)
        u = await db.users.find_one({'id': d['_id']})
        out.append({
            'userId': d['_id'],
            'userName': u['name'] if u else lm.get('userName', 'Unknown'),
            'userEmail': u['email'] if u else None,
            'userAvatar': u.get('avatar') if u else None,
            'lastMessage': lm,
            'count': d['count'],
            'unread': d['unread'],
        })
    return out

@api.get('/admin/messages/{user_id}')
async def admin_thread(user_id: str, admin = Depends(get_admin)):
    msgs = await db.messages.find({'userId': user_id}).sort('createdAt', 1).to_list(500)
    for m in msgs: m.pop('_id', None)
    await db.messages.update_many({'userId': user_id, 'fromAdmin': False, 'read': False}, {'$set': {'read': True}})
    return msgs

@api.post('/admin/messages')
async def admin_send(body: AdminMessageCreate, admin = Depends(get_admin)):
    if not body.text or not body.text.strip():
        raise HTTPException(400, 'Empty message')
    u = await db.users.find_one({'id': body.userId})
    if not u: raise HTTPException(404, 'User not found')
    msg = {
        'id': str(uuid.uuid4()),
        'userId': body.userId,
        'userName': u['name'],
        'text': body.text.strip()[:2000],
        'fromAdmin': True,
        'adminName': admin.get('name', 'Support'),
        'read': False,
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.messages.insert_one(msg)
    msg.pop('_id', None)
    # Notify the user
    await push_notification(body.userId, 'New reply from support', body.text.strip()[:120], 'system')
    return msg

@api.get('/admin/messages-unread-count')
async def admin_unread(admin = Depends(get_admin)):
    c = await db.messages.count_documents({'fromAdmin': False, 'read': False})
    return {'count': c}


# Payment settings (public for storefront to read, admin for write)
@api.get('/settings/payment')
async def get_payment_settings():
    s = await db.settings.find_one({'key': 'payment'})
    if not s:
        return {'bkashNumber': '', 'nagadNumber': '', 'bkashType': 'personal', 'nagadType': 'personal', 'instructions': ''}
    s.pop('_id', None); s.pop('key', None)
    return s

@api.put('/admin/settings/payment')
async def update_payment_settings(body: PaymentSettings, admin = Depends(get_admin)):
    data = body.model_dump()
    await db.settings.update_one({'key': 'payment'}, {'$set': {**data, 'key': 'payment'}}, upsert=True)
    return data


# Site Settings (public read, admin write)
SITE_DEFAULTS = {
    'siteName': 'প্রকৃতির ঘ্রাণ',
    'tagline': 'Farm-fresh organic goodness',
    'contactPhone': '', 'contactEmail': '', 'contactAddress': '',
    'facebookUrl': '', 'instagramUrl': '', 'whatsappNumber': '',
    'deliveryFee': 60, 'freeDeliveryAbove': 500, 'aboutText': '',
    'globalDiscountPercent': 0, 'globalDiscountLabel': '', 'taxPercent': 0, 'minOrderAmount': 0,
    'logoUrl': '', 'brandColor': '#047857', 'brandColorDark': '#065f46', 'themeId': 'emerald',
    'deliveryZones': [], 'outsideFee': 120,
    'showChatWidget': True, 'showTracker': True, 'showNewsletter': True,
}

@api.get('/settings/site')
async def get_site_settings():
    s = await db.settings.find_one({'key': 'site'})
    if not s: return SITE_DEFAULTS
    s.pop('_id', None); s.pop('key', None)
    return {**SITE_DEFAULTS, **s}

@api.put('/admin/settings/site')
async def update_site_settings(body: SiteSettings, admin = Depends(get_admin)):
    data = body.model_dump()
    await db.settings.update_one({'key': 'site'}, {'$set': {**data, 'key': 'site'}}, upsert=True)
    return data


# Banners (public read, admin CRUD)
@api.get('/banners')
async def list_banners():
    items = await db.banners.find({'active': True}).sort('order', 1).to_list(50)
    for b in items: b.pop('_id', None)
    return items

@api.get('/admin/banners')
async def admin_list_banners(admin = Depends(get_admin)):
    items = await db.banners.find().sort('order', 1).to_list(100)
    for b in items: b.pop('_id', None)
    return items

@api.post('/admin/banners')
async def admin_create_banner(body: BannerUpsert, admin = Depends(get_admin)):
    banner = {'id': str(uuid.uuid4()), **body.model_dump(), 'createdAt': datetime.utcnow().isoformat()}
    await db.banners.insert_one(banner); banner.pop('_id', None)
    return banner

@api.put('/admin/banners/{banner_id}')
async def admin_update_banner(banner_id: str, body: BannerUpsert, admin = Depends(get_admin)):
    res = await db.banners.update_one({'id': banner_id}, {'$set': body.model_dump()})
    if res.matched_count == 0: raise HTTPException(404, 'Banner not found')
    b = await db.banners.find_one({'id': banner_id}); b.pop('_id', None)
    return b

@api.delete('/admin/banners/{banner_id}')
async def admin_delete_banner(banner_id: str, admin = Depends(get_admin)):
    res = await db.banners.delete_one({'id': banner_id})
    if res.deleted_count == 0: raise HTTPException(404, 'Banner not found')
    return {'ok': True}


# Coupons
def _calc_discount(coupon: dict, subtotal: float) -> float:
    if coupon['type'] == 'flat':
        return min(coupon['value'], subtotal)
    pct = subtotal * (coupon['value'] / 100.0)
    if coupon.get('maxDiscount'):
        pct = min(pct, coupon['maxDiscount'])
    return round(pct, 2)

@api.post('/coupons/apply')
async def apply_coupon(body: CouponApply, user = Depends(get_current_user)):
    code = body.code.strip().upper()
    c = await db.coupons.find_one({'code': code})
    if not c: raise HTTPException(404, 'Invalid coupon code')
    if not c.get('active', True): raise HTTPException(400, 'Coupon inactive')
    if c.get('expiresAt'):
        try:
            if datetime.fromisoformat(c['expiresAt']) < datetime.utcnow():
                raise HTTPException(400, 'Coupon expired')
        except ValueError:
            pass
    if c.get('usageLimit') and c.get('usedCount', 0) >= c['usageLimit']:
        raise HTTPException(400, 'Coupon usage limit reached')
    if body.subtotal < (c.get('minOrder') or 0):
        raise HTTPException(400, f"Minimum order ৳{c.get('minOrder')} required")
    discount = _calc_discount(c, body.subtotal)
    return {'code': c['code'], 'type': c['type'], 'value': c['value'], 'discount': discount}

@api.get('/admin/coupons')
async def admin_list_coupons(admin = Depends(get_admin)):
    items = await db.coupons.find().sort('createdAt', -1).to_list(200)
    for c in items: c.pop('_id', None)
    return items

@api.post('/admin/coupons')
async def admin_create_coupon(body: CouponUpsert, admin = Depends(get_admin)):
    code = body.code.strip().upper()
    if await db.coupons.find_one({'code': code}):
        raise HTTPException(400, 'Coupon code already exists')
    c = {'id': str(uuid.uuid4()), **body.model_dump(), 'code': code, 'usedCount': 0, 'createdAt': datetime.utcnow().isoformat()}
    await db.coupons.insert_one(c); c.pop('_id', None)
    return c

@api.put('/admin/coupons/{coupon_id}')
async def admin_update_coupon(coupon_id: str, body: CouponUpsert, admin = Depends(get_admin)):
    data = body.model_dump(); data['code'] = data['code'].strip().upper()
    res = await db.coupons.update_one({'id': coupon_id}, {'$set': data})
    if res.matched_count == 0: raise HTTPException(404, 'Coupon not found')
    c = await db.coupons.find_one({'id': coupon_id}); c.pop('_id', None)
    return c

@api.delete('/admin/coupons/{coupon_id}')
async def admin_delete_coupon(coupon_id: str, admin = Depends(get_admin)):
    res = await db.coupons.delete_one({'id': coupon_id})
    if res.deleted_count == 0: raise HTTPException(404, 'Coupon not found')
    return {'ok': True}


# Admin: verify or reject a manual bKash/Nagad payment
@api.patch('/admin/orders/{order_id}/payment')
async def admin_verify_payment(order_id: str, body: PaymentVerifyAdmin, admin = Depends(get_admin)):
    o = await db.orders.find_one({'id': order_id})
    if not o: raise HTTPException(404, 'Order not found')
    if o.get('paymentMethod') == 'cod':
        raise HTTPException(400, 'COD orders do not need payment verification')
    new_payment_status = body.status
    new_order_status = 'confirmed' if body.status == 'paid' else o.get('status', 'pending')
    update = {'paymentStatus': new_payment_status, 'paymentNote': body.note, 'status': new_order_status}
    await db.orders.update_one({'id': order_id}, {'$set': update})
    if body.status == 'paid':
        title = f"পেমেন্ট কনফার্ম · {o['orderNo']}"
        msg = f"আপনার ৳{o['total']:.0f} পেমেন্ট ভেরিফাই করা হয়েছে। শীঘ্রই অর্ডার ডেলিভার করা হবে।"
    else:
        title = f"পেমেন্ট সমস্যা · {o['orderNo']}"
        msg = body.note or 'আপনার পেমেন্ট ভেরিফাই করা যায়নি। ট্রানজেকশন আইডি চেক করে আবার চেষ্টা করুন।'
    await push_notification(o['userId'], title, msg, 'order', order_id)
    o = await db.orders.find_one({'id': order_id}); o.pop('_id', None)
    return o


# Categories
@api.get('/categories')
async def list_categories():
    cats = await db.categories.find().to_list(100)
    for c in cats: c.pop('_id', None)
    return cats


# Products
@api.get('/products')
async def list_products(
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    q: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    organic: Optional[bool] = None,
    inStock: Optional[bool] = None,
    sort: Optional[str] = 'newest',
):
    query = {}
    if category: query['category'] = category
    if featured is not None: query['featured'] = featured
    if organic is not None: query['organic'] = organic
    if inStock is True: query['stock'] = {'$gt': 0}
    if minPrice is not None or maxPrice is not None:
        rng = {}
        if minPrice is not None: rng['$gte'] = minPrice
        if maxPrice is not None: rng['$lte'] = maxPrice
        query['price'] = rng
    if q:
        query['$or'] = [
            {'name': {'$regex': q, '$options': 'i'}},
            {'description': {'$regex': q, '$options': 'i'}},
        ]
    sort_map = {
        'newest': [('createdAt', -1)],
        'price-asc': [('price', 1)],
        'price-desc': [('price', -1)],
        'rating': [('avgRating', -1), ('reviewCount', -1)],
    }
    cur = db.products.find(query).sort(sort_map.get(sort, sort_map['newest']))
    products = await cur.to_list(500)
    for p in products: p.pop('_id', None)
    return products

@api.get('/products/{slug}')
async def get_product(slug: str):
    p = await db.products.find_one({'slug': slug})
    if not p: raise HTTPException(404, 'Product not found')
    p.pop('_id', None)
    return p

@api.post('/products')
async def create_product(body: ProductCreate, admin = Depends(get_admin)):
    slug = body.slug or slugify(body.name)
    if await db.products.find_one({'slug': slug}):
        slug = f"{slug}-{str(uuid.uuid4())[:6]}"
    product = {
        'id': str(uuid.uuid4()),
        'slug': slug,
        'name': body.name,
        'description': body.description,
        'price': body.price,
        'oldPrice': body.oldPrice,
        'discount': int(round((1 - body.price / body.oldPrice) * 100)) if body.oldPrice and body.oldPrice > body.price else None,
        'image': body.image,
        'images': body.images or [body.image],
        'category': body.category,
        'unit': body.unit,
        'stock': body.stock,
        'organic': body.organic,
        'featured': body.featured,
        'tags': body.tags or [],
        'variants': [v.model_dump() for v in (body.variants or [])],
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.products.insert_one(product)
    product.pop('_id', None)
    return product

@api.put('/products/{product_id}')
async def update_product(product_id: str, body: ProductUpdate, admin = Depends(get_admin)):
    existing = await db.products.find_one({'id': product_id})
    if not existing: raise HTTPException(404, 'Product not found')
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    # Serialize nested variants (list of ProductVariant pydantic → dicts)
    if 'variants' in update and update['variants'] is not None:
        update['variants'] = [v if isinstance(v, dict) else v.model_dump() for v in update['variants']]
    if 'price' in update or 'oldPrice' in update:
        price = update.get('price', existing.get('price'))
        old = update.get('oldPrice', existing.get('oldPrice'))
        update['discount'] = int(round((1 - price / old) * 100)) if old and old > price else None
    await db.products.update_one({'id': product_id}, {'$set': update})
    p = await db.products.find_one({'id': product_id})
    p.pop('_id', None)
    return p

@api.delete('/products/{product_id}')
async def delete_product(product_id: str, admin = Depends(get_admin)):
    res = await db.products.delete_one({'id': product_id})
    if res.deleted_count == 0: raise HTTPException(404, 'Product not found')
    return {'ok': True}


# Related products — same category, exclude self
@api.get('/products/{slug}/related')
async def related_products(slug: str, limit: int = 8):
    p = await db.products.find_one({'slug': slug})
    if not p: return []
    cur = db.products.find({'category': p.get('category'), 'slug': {'$ne': slug}}).sort('createdAt', -1)
    items = await cur.to_list(limit)
    for it in items: it.pop('_id', None)
    return items


# Reviews — users who ordered a product can review it once
@api.get('/products/{product_id}/reviews')
async def list_reviews(product_id: str):
    items = await db.reviews.find({'productId': product_id}).sort('createdAt', -1).to_list(200)
    for r in items: r.pop('_id', None)
    return items

async def _recompute_product_rating(product_id: str):
    pipeline = [
        {'$match': {'productId': product_id}},
        {'$group': {'_id': None, 'avg': {'$avg': '$rating'}, 'count': {'$sum': 1}}},
    ]
    avg, count = 0.0, 0
    async for d in db.reviews.aggregate(pipeline):
        avg = round(float(d.get('avg', 0) or 0), 2)
        count = int(d.get('count', 0) or 0)
    await db.products.update_one({'id': product_id}, {'$set': {'avgRating': avg, 'reviewCount': count}})

@api.post('/reviews')
async def create_review(body: ReviewCreate, user = Depends(get_current_user)):
    if not 1 <= body.rating <= 5: raise HTTPException(400, 'Rating must be 1-5')
    product = await db.products.find_one({'id': body.productId})
    if not product: raise HTTPException(404, 'Product not found')
    # must have ordered this product
    has_ordered = await db.orders.find_one({'userId': user['id'], 'items.productId': body.productId})
    if not has_ordered: raise HTTPException(403, 'You can only review products you have ordered')
    # one review per user per product
    existing = await db.reviews.find_one({'productId': body.productId, 'userId': user['id']})
    review = {
        'id': existing['id'] if existing else str(uuid.uuid4()),
        'productId': body.productId,
        'productSlug': product.get('slug'),
        'userId': user['id'],
        'userName': user['name'],
        'rating': body.rating,
        'text': (body.text or '').strip()[:1000],
        'createdAt': existing['createdAt'] if existing else datetime.utcnow().isoformat(),
        'updatedAt': datetime.utcnow().isoformat(),
    }
    if existing:
        await db.reviews.update_one({'id': existing['id']}, {'$set': review})
    else:
        await db.reviews.insert_one(review)
    await _recompute_product_rating(body.productId)
    review.pop('_id', None)
    return review

@api.delete('/admin/reviews/{review_id}')
async def admin_delete_review(review_id: str, admin = Depends(get_admin)):
    r = await db.reviews.find_one({'id': review_id})
    if not r: raise HTTPException(404, 'Review not found')
    await db.reviews.delete_one({'id': review_id})
    await _recompute_product_rating(r['productId'])
    return {'ok': True}

@api.get('/admin/reviews')
async def admin_list_reviews(admin = Depends(get_admin)):
    items = await db.reviews.find().sort('createdAt', -1).to_list(500)
    for r in items: r.pop('_id', None)
    return items


# Wishlist — stored as array of productIds on user
@api.get('/auth/me/wishlist')
async def get_wishlist(user = Depends(get_current_user)):
    u = await db.users.find_one({'id': user['id']})
    ids = u.get('wishlist', []) or []
    if not ids: return []
    products = await db.products.find({'id': {'$in': ids}}).to_list(200)
    for p in products: p.pop('_id', None)
    return products

@api.post('/auth/me/wishlist/{product_id}')
async def toggle_wishlist(product_id: str, user = Depends(get_current_user)):
    p = await db.products.find_one({'id': product_id})
    if not p: raise HTTPException(404, 'Product not found')
    u = await db.users.find_one({'id': user['id']})
    items = u.get('wishlist', []) or []
    in_list = product_id in items
    if in_list:
        items = [i for i in items if i != product_id]
    else:
        items.append(product_id)
    await db.users.update_one({'id': user['id']}, {'$set': {'wishlist': items}})
    return {'inWishlist': not in_list, 'wishlistCount': len(items)}


# Newsletter subscriptions
@api.post('/newsletter')
async def subscribe_newsletter(body: NewsletterSub):
    email = body.email.strip().lower()
    if not email or '@' not in email: raise HTTPException(400, 'Invalid email')
    existing = await db.newsletter.find_one({'email': email})
    if existing: return {'ok': True, 'alreadySubscribed': True}
    await db.newsletter.insert_one({'id': str(uuid.uuid4()), 'email': email, 'createdAt': datetime.utcnow().isoformat()})
    return {'ok': True, 'alreadySubscribed': False}

@api.get('/admin/newsletter')
async def list_newsletter(admin = Depends(get_admin)):
    items = await db.newsletter.find().sort('createdAt', -1).to_list(1000)
    for it in items: it.pop('_id', None)
    return items


# Password reset (demo: token returned in response and logged; in prod, send via email)
@api.post('/auth/forgot')
@limiter.limit('5/minute')
async def forgot_password(request: Request, body: PasswordForgot):
    email = body.email.strip().lower()
    u = await db.users.find_one({'email': email})
    # Always respond OK to prevent email enumeration
    if not u: return {'ok': True}
    token = str(uuid.uuid4()).replace('-', '')[:32]
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    await db.password_resets.insert_one({'token': token, 'userId': u['id'], 'expiresAt': expires, 'used': False, 'createdAt': datetime.utcnow().isoformat()})
    logging.info(f"Password reset token for {email}: {token}")
    # Return the token in the response for demo; in production this should be sent via email only
    return {'ok': True, 'resetToken': token, 'note': 'Token shown for demo; in production this is sent via email.'}

@api.post('/auth/reset')
@limiter.limit('5/minute')
async def reset_password(request: Request, body: PasswordReset):
    if len(body.newPassword) < 6: raise HTTPException(400, 'Password too short (min 6)')
    rec = await db.password_resets.find_one({'token': body.token})
    if not rec or rec.get('used'): raise HTTPException(400, 'Invalid or used token')
    try:
        if datetime.fromisoformat(rec['expiresAt']) < datetime.utcnow():
            raise HTTPException(400, 'Token expired')
    except ValueError:
        raise HTTPException(400, 'Token invalid')
    await db.users.update_one({'id': rec['userId']}, {'$set': {'password': hash_password(body.newPassword)}})
    await db.password_resets.update_one({'token': body.token}, {'$set': {'used': True}})
    return {'ok': True}


# Payments — simulated
@api.post('/payments/initiate')
async def payment_initiate(body: PaymentInitiate):
    """Simulates bKash/Nagad payment flow.  Returns a sessionId; client then verifies with OTP."""
    if len(body.phone) < 10:
        raise HTTPException(400, 'Invalid phone')
    session = {
        'id': str(uuid.uuid4()),
        'method': body.method,
        'phone': body.phone,
        'amount': body.amount,
        # Demo OTP — always 1234 for ease of testing in MVP. In real life this would be sent via SMS.
        'otp': '1234',
        'status': 'pending',
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.payment_sessions.insert_one(session)
    await asyncio.sleep(0.5)  # simulate network latency
    return {
        'sessionId': session['id'],
        'method': session['method'],
        'amount': session['amount'],
        'phone': session['phone'],
        # We return the demo otp so users know what to enter; real systems do not.
        'demoOtp': '1234',
        'message': f"OTP sent to {session['phone']} (demo OTP is 1234)"
    }

@api.post('/payments/verify')
async def payment_verify(body: PaymentVerify):
    session = await db.payment_sessions.find_one({'id': body.sessionId})
    if not session: raise HTTPException(404, 'Payment session not found')
    if session['status'] == 'verified':
        return {'verified': True, 'txnId': session.get('txnId')}
    if body.otp != session['otp']:
        raise HTTPException(400, 'Invalid OTP')
    txn = f"TXN{random.randint(10**9, 10**10 - 1)}"
    await db.payment_sessions.update_one({'id': session['id']}, {'$set': {'status': 'verified', 'txnId': txn}})
    return {'verified': True, 'txnId': txn, 'method': session['method'], 'amount': session['amount']}


# Orders
@api.post('/orders')
@limiter.limit('30/minute')
async def create_order(request: Request, body: OrderCreate, user = Depends(get_optional_user)):
    # For bKash/Nagad — payment is verified manually by admin; require txn id
    if body.paymentMethod in ('bkash', 'nagad'):
        if not body.paymentPhone or not body.paymentTxn:
            raise HTTPException(400, 'Sender phone and transaction ID required for bKash/Nagad')
    is_guest = user is None
    # For guest orders, derive name/phone from the delivery address payload
    if is_guest:
        if not body.address.fullName or not body.address.phone:
            raise HTTPException(400, 'Full name and phone are required for guest checkout')
        user_id = None
        user_name = body.address.fullName
        user_phone = body.address.phone
    else:
        user_id = user['id']
        user_name = user['name']
        user_phone = user['phone']
    order = {
        'id': str(uuid.uuid4()),
        'orderNo': f"ORD-{datetime.utcnow().strftime('%y%m%d')}-{random.randint(1000, 9999)}",
        'userId': user_id,
        'userName': user_name,
        'userPhone': user_phone,
        'guest': is_guest,
        'items': [i.model_dump() for i in body.items],
        'address': body.address.model_dump(),
        'paymentMethod': body.paymentMethod,
        'paymentPhone': body.paymentPhone,
        'paymentTxn': body.paymentTxn,
        'paymentNote': None,
        'subtotal': body.subtotal,
        'delivery': body.delivery,
        'discount': body.discount or 0,
        'couponCode': body.couponCode,
        'total': body.total,
        # COD: pending order, unpaid (collect cash on delivery)
        # bKash/Nagad: pending order, pending payment verification by admin
        'status': 'pending',
        'paymentStatus': 'unpaid' if body.paymentMethod == 'cod' else 'pending',
        'statusHistory': [{'status': 'pending', 'at': datetime.utcnow().isoformat(), 'by': 'system'}],
        'createdAt': datetime.utcnow().isoformat(),
    }
    await db.orders.insert_one(order)
    # decrement stock per item
    for item in body.items:
        await db.products.update_one({'id': item.productId, 'stock': {'$gte': item.qty}}, {'$inc': {'stock': -item.qty}})
    # increment coupon usedCount if applied
    if body.couponCode:
        await db.coupons.update_one({'code': body.couponCode.strip().upper()}, {'$inc': {'usedCount': 1}})
    if body.paymentMethod == 'cod':
        msg = f"আপনার অর্ডার ৳{order['total']:.0f} গ্রহণ করা হয়েছে। ডেলিভারির সময় ক্যাশ পেমেন্ট করুন।"
    else:
        msg = f"আপনার অর্ডার ৳{order['total']:.0f} গ্রহণ করা হয়েছে। পেমেন্ট ভেরিফিকেশন বাকি — আমরা শীঘ্রই কনফার্ম করব।"
    # Only push notification for logged-in users (guest has no account to receive notifications)
    if not is_guest:
        await push_notification(user_id, f"অর্ডার গৃহীত · {order['orderNo']}", msg, 'order', order['id'])
    order.pop('_id', None)
    return order

@api.get('/orders/my')
async def my_orders(user = Depends(get_current_user)):
    orders = await db.orders.find({'userId': user['id']}).sort('createdAt', -1).to_list(200)
    for o in orders: o.pop('_id', None)
    return orders

# Public order tracking — guest customers can look up by order number + phone (no auth)
@api.get('/orders/track/{order_no}')
@limiter.limit('20/minute')
async def track_order_public(request: Request, order_no: str, phone: str):
    if not phone or len(phone.strip()) < 4:
        raise HTTPException(400, 'Phone is required to track an order')
    p = phone.strip()
    # Match either delivery-address phone or stored userPhone (last 6 digits compare to be lenient)
    o = await db.orders.find_one({'orderNo': order_no.strip()})
    if not o:
        raise HTTPException(404, 'Order not found')
    addr_phone = (o.get('address', {}) or {}).get('phone', '') or ''
    user_phone = o.get('userPhone', '') or ''
    def _norm(x: str) -> str:
        return ''.join(c for c in (x or '') if c.isdigit())
    np = _norm(p)
    if not np or (_norm(addr_phone)[-6:] != np[-6:] and _norm(user_phone)[-6:] != np[-6:]):
        raise HTTPException(403, 'Phone does not match this order')
    o.pop('_id', None)
    return o

@api.get('/orders/{order_id}')
async def get_order(order_id: str, user = Depends(get_current_user)):
    o = await db.orders.find_one({'id': order_id})
    if not o: raise HTTPException(404, 'Order not found')
    if o['userId'] != user['id'] and user.get('role') != 'admin':
        raise HTTPException(403, 'Forbidden')
    o.pop('_id', None)
    return o

@api.get('/admin/orders')
async def admin_orders(admin = Depends(get_admin)):
    orders = await db.orders.find().sort('createdAt', -1).to_list(500)
    for o in orders: o.pop('_id', None)
    return orders

@api.patch('/admin/orders/{order_id}')
async def admin_update_order(order_id: str, body: OrderStatusUpdate, admin = Depends(get_admin)):
    o = await db.orders.find_one({'id': order_id})
    if not o: raise HTTPException(404, 'Order not found')
    history = o.get('statusHistory', []) or []
    history.append({'status': body.status, 'at': datetime.utcnow().isoformat(), 'by': admin['name']})
    await db.orders.update_one({'id': order_id}, {'$set': {'status': body.status, 'statusHistory': history}})
    status_msgs = {
        'confirmed': 'has been confirmed. Preparing for dispatch.',
        'shipped': 'is on the way! Track from your orders.',
        'delivered': 'has been delivered. Enjoy your organic goodies!',
        'cancelled': 'has been cancelled. Please contact support if this was a mistake.',
        'pending': 'is pending review.',
    }
    await push_notification(o['userId'], f"Order {body.status} · {o['orderNo']}", f"Your order {status_msgs.get(body.status, '')}", 'order', order_id)
    o = await db.orders.find_one({'id': order_id}); o.pop('_id', None)
    return o

@api.get('/admin/stats')
async def admin_stats(admin = Depends(get_admin)):
    products = await db.products.count_documents({})
    orders = await db.orders.count_documents({})
    customers = await db.users.count_documents({'role': 'customer'})
    pipeline = [{'$group': {'_id': None, 'total': {'$sum': '$total'}}}]
    cur = db.orders.aggregate(pipeline)
    rev = 0
    async for d in cur: rev = d.get('total', 0)
    pending = await db.orders.count_documents({'status': 'pending'})
    return {'products': products, 'orders': orders, 'customers': customers, 'revenue': rev, 'pendingOrders': pending}


@api.get('/admin/users')
async def admin_users(admin = Depends(get_admin)):
    users = await db.users.find({'role': 'customer'}).sort('createdAt', -1).to_list(500)
    out = []
    for u in users:
        u.pop('_id', None); u.pop('password', None)
        order_count = await db.orders.count_documents({'userId': u['id']})
        pipeline = [{'$match': {'userId': u['id']}}, {'$group': {'_id': None, 'total': {'$sum': '$total'}}}]
        spent = 0
        async for d in db.orders.aggregate(pipeline): spent = d.get('total', 0)
        u['orderCount'] = order_count
        u['totalSpent'] = spent
        out.append(u)
    return out


@api.get('/admin/users/{user_id}')
async def admin_user_detail(user_id: str, admin = Depends(get_admin)):
    u = await db.users.find_one({'id': user_id})
    if not u: raise HTTPException(404, 'User not found')
    u.pop('_id', None); u.pop('password', None)
    orders = await db.orders.find({'userId': user_id}).sort('createdAt', -1).to_list(200)
    for o in orders: o.pop('_id', None)
    return {'user': u, 'orders': orders}


# Notifications
@api.get('/notifications')
async def list_notifications(user = Depends(get_current_user)):
    items = await db.notifications.find({'userId': user['id']}).sort('createdAt', -1).to_list(200)
    for n in items: n.pop('_id', None)
    return items

@api.get('/notifications/unread-count')
async def unread_count(user = Depends(get_current_user)):
    c = await db.notifications.count_documents({'userId': user['id'], 'read': False})
    return {'count': c}

@api.post('/notifications/{nid}/read')
async def mark_read(nid: str, user = Depends(get_current_user)):
    await db.notifications.update_one({'id': nid, 'userId': user['id']}, {'$set': {'read': True}})
    return {'ok': True}

@api.post('/notifications/read-all')
async def mark_all_read(user = Depends(get_current_user)):
    await db.notifications.update_many({'userId': user['id'], 'read': False}, {'$set': {'read': True}})
    return {'ok': True}


# Admin: broadcast notification + categories CRUD + analytics
@api.post('/admin/notifications/broadcast')
async def broadcast(body: NotificationCreate, admin = Depends(get_admin)):
    await push_notification(body.userId, body.title, body.body, body.type, body.orderId)
    return {'ok': True}

@api.post('/admin/categories')
async def admin_create_category(body: CategoryUpsert, admin = Depends(get_admin)):
    if await db.categories.find_one({'slug': body.slug}):
        raise HTTPException(400, 'Category slug exists')
    cat = {'id': str(uuid.uuid4()), 'slug': body.slug, 'name': body.name, 'icon': body.icon, 'image': body.image}
    await db.categories.insert_one(cat); cat.pop('_id', None)
    return cat

@api.put('/admin/categories/{cat_id}')
async def admin_update_category(cat_id: str, body: CategoryUpsert, admin = Depends(get_admin)):
    res = await db.categories.update_one({'id': cat_id}, {'$set': body.model_dump()})
    if res.matched_count == 0: raise HTTPException(404, 'Category not found')
    cat = await db.categories.find_one({'id': cat_id}); cat.pop('_id', None)
    return cat

@api.delete('/admin/categories/{cat_id}')
async def admin_delete_category(cat_id: str, admin = Depends(get_admin)):
    res = await db.categories.delete_one({'id': cat_id})
    if res.deleted_count == 0: raise HTTPException(404, 'Category not found')
    return {'ok': True}

@api.get('/admin/analytics')
async def admin_analytics(admin = Depends(get_admin)):
    """Revenue + order counts grouped by day for the last 14 days, plus top products & status breakdown."""
    from collections import defaultdict
    today = datetime.utcnow()
    start = today - timedelta(days=13)
    orders = await db.orders.find({}).to_list(2000)
    daily_rev = defaultdict(float); daily_cnt = defaultdict(int)
    status_counts = defaultdict(int); method_counts = defaultdict(int)
    product_sales = defaultdict(lambda: {'name': '', 'qty': 0, 'revenue': 0.0, 'image': ''})
    for o in orders:
        d = o.get('createdAt', '')[:10]
        daily_rev[d] += o.get('total', 0)
        daily_cnt[d] += 1
        status_counts[o.get('status', 'pending')] += 1
        method_counts[o.get('paymentMethod', 'cod')] += 1
        for it in o.get('items', []):
            ps = product_sales[it.get('productId', it.get('name'))]
            ps['name'] = it.get('name'); ps['image'] = it.get('image')
            ps['qty'] += it.get('qty', 0); ps['revenue'] += it.get('price', 0) * it.get('qty', 0)
    # Build 14-day series
    series = []
    for i in range(14):
        d = (start + timedelta(days=i)).strftime('%Y-%m-%d')
        series.append({'date': d, 'revenue': round(daily_rev.get(d, 0), 2), 'orders': daily_cnt.get(d, 0)})
    top = sorted(product_sales.values(), key=lambda x: x['revenue'], reverse=True)[:5]
    return {
        'series': series,
        'statusCounts': dict(status_counts),
        'methodCounts': dict(method_counts),
        'topProducts': top,
        'totalRevenue': round(sum(daily_rev.values()), 2),
        'totalOrders': sum(daily_cnt.values()),
    }


# ------------ Seed ------------
ORGANIC_CATEGORIES = [
    {'slug': 'fruits-vegetables', 'name': 'Fruits & Vegetables', 'icon': 'Apple', 'image': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80'},
    {'slug': 'honey-sweeteners', 'name': 'Honey & Sweeteners', 'icon': 'Candy', 'image': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=80'},
    {'slug': 'oils-ghee', 'name': 'Oils & Ghee', 'icon': 'Droplet', 'image': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80'},
    {'slug': 'spices', 'name': 'Spices', 'icon': 'Flame', 'image': 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400&q=80'},
    {'slug': 'grains-pulses', 'name': 'Grains & Pulses', 'icon': 'Wheat', 'image': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80'},
    {'slug': 'dairy', 'name': 'Dairy', 'icon': 'Milk', 'image': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&q=80'},
    {'slug': 'tea-beverages', 'name': 'Tea & Beverages', 'icon': 'Coffee', 'image': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&q=80'},
    {'slug': 'personal-care', 'name': 'Personal Care', 'icon': 'Sparkles', 'image': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80'},
]

SEED_PRODUCTS = [
    {'name': 'Organic Sundarban Honey', 'description': '100% pure raw honey collected from the Sundarbans — unprocessed, unfiltered, naturally rich in antioxidants.', 'price': 750, 'oldPrice': 950, 'image': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80', 'category': 'honey-sweeteners', 'unit': '500 g', 'featured': True, 'stock': 50},
    {'name': 'Cold-Pressed Mustard Oil', 'description': 'Wood-pressed mustard oil from organic mustard seeds — pungent, golden, traditional Bengali kitchen staple.', 'price': 420, 'oldPrice': 520, 'image': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80', 'category': 'oils-ghee', 'unit': '1 L', 'featured': True, 'stock': 80},
    {'name': 'Pure Cow Ghee', 'description': 'Hand-churned bilona ghee from grass-fed cows. Rich aroma, golden grain — perfect for cooking & wellness.', 'price': 1450, 'oldPrice': 1650, 'image': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80', 'category': 'oils-ghee', 'unit': '500 g', 'featured': True, 'stock': 40},
    {'name': 'Organic Red Chilli Powder', 'description': 'Sun-dried & stone-ground red chillies — no artificial colours, no preservatives. Smoky, sharp heat.', 'price': 240, 'oldPrice': 300, 'image': 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=800&q=80', 'category': 'spices', 'unit': '250 g', 'featured': True, 'stock': 120},
    {'name': 'Organic Turmeric Powder', 'description': 'High-curcumin organic turmeric — golden, earthy, anti-inflammatory. Stone-ground in small batches.', 'price': 180, 'image': 'https://images.unsplash.com/photo-1615485500704-8e990f9900e7?w=800&q=80', 'category': 'spices', 'unit': '250 g', 'stock': 100},
    {'name': 'Organic Brown Rice', 'description': 'Unpolished aromatic brown rice — high in fibre, slow-grown without chemicals. Wholesome staple.', 'price': 180, 'oldPrice': 220, 'image': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80', 'category': 'grains-pulses', 'unit': '1 kg', 'stock': 200},
    {'name': 'Organic Red Lentils (Masoor Dal)', 'description': 'Premium organic split red lentils. Cooks fast, naturally sweet, protein-rich daily essential.', 'price': 160, 'image': 'https://images.unsplash.com/photo-1612257999782-1d3d1d3d4f4f?w=800&q=80', 'category': 'grains-pulses', 'unit': '1 kg', 'stock': 150},
    {'name': 'Farm Fresh Tomatoes', 'description': 'Vine-ripened organic tomatoes, picked the same morning. Juicy, sweet & full of flavour.', 'price': 80, 'oldPrice': 100, 'image': 'https://images.unsplash.com/photo-1546470427-e84a4b3ea0f5?w=800&q=80', 'category': 'fruits-vegetables', 'unit': '1 kg', 'featured': True, 'stock': 60},
    {'name': 'Organic Spinach Bunch', 'description': 'Hand-picked organic spinach — pesticide-free, washed, ready to cook. Iron-rich leafy goodness.', 'price': 45, 'image': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80', 'category': 'fruits-vegetables', 'unit': '500 g', 'stock': 40},
    {'name': 'Sweet Bananas (Sagor Kola)', 'description': 'Chemical-free, naturally ripened sagor bananas. Creamy texture, mellow sweetness.', 'price': 90, 'image': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80', 'category': 'fruits-vegetables', 'unit': '1 dozen', 'stock': 80},
    {'name': 'Pure Cow Milk', 'description': 'Fresh whole milk from grass-fed cows, delivered chilled. No preservatives, no powder.', 'price': 110, 'image': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&q=80', 'category': 'dairy', 'unit': '1 L', 'stock': 30},
    {'name': 'Organic Set Yogurt (Doi)', 'description': 'Slow-set creamy yogurt in earthen pots — traditional, mildly tangy, probiotic-rich.', 'price': 140, 'oldPrice': 170, 'image': 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=800&q=80', 'category': 'dairy', 'unit': '500 g', 'stock': 25},
    {'name': 'Organic Sylhet Tea Leaves', 'description': 'Single-estate organic black tea from Sylhet hills. Bold, malty, brewed strong.', 'price': 320, 'oldPrice': 400, 'image': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&q=80', 'category': 'tea-beverages', 'unit': '250 g', 'featured': True, 'stock': 70},
    {'name': 'Cold-Pressed Coconut Oil', 'description': 'Virgin coconut oil — cold-pressed for skin, hair & cooking. Mild aroma, all natural.', 'price': 380, 'image': 'https://images.unsplash.com/photo-1638515767867-c8b80fdf6c4d?w=800&q=80', 'category': 'personal-care', 'unit': '500 ml', 'stock': 90},
    {'name': 'Neem & Tulsi Handmade Soap', 'description': 'Cold-process handmade soap with neem & tulsi extracts — gentle, antibacterial, plastic-free.', 'price': 120, 'image': 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80', 'category': 'personal-care', 'unit': '100 g', 'stock': 200},
    {'name': 'Organic Black Pepper', 'description': 'Whole organic black peppercorns — sharp, fragrant, hand-graded. Grind fresh for best aroma.', 'price': 280, 'image': 'https://images.unsplash.com/photo-1599909533730-d4ae292ce5dd?w=800&q=80', 'category': 'spices', 'unit': '100 g', 'stock': 110},
]


@app.on_event('startup')
async def seed():
    # Admin user
    if not await db.users.find_one({'role': 'admin'}):
        await db.users.insert_one({
            'id': str(uuid.uuid4()),
            'name': 'Admin',
            'email': 'admin@organicshop.com',
            'phone': '01700000000',
            'password': hash_password('admin123'),
            'role': 'admin',
            'createdAt': datetime.utcnow().isoformat(),
        })
        logging.info('Seeded admin user: admin@organicshop.com / admin123')

    # Categories
    if await db.categories.count_documents({}) == 0:
        for c in ORGANIC_CATEGORIES:
            await db.categories.insert_one({'id': str(uuid.uuid4()), **c})
        logging.info('Seeded categories')

    # Products
    if await db.products.count_documents({}) == 0:
        for p in SEED_PRODUCTS:
            slug = slugify(p['name'])
            discount = int(round((1 - p['price'] / p['oldPrice']) * 100)) if p.get('oldPrice') and p['oldPrice'] > p['price'] else None
            await db.products.insert_one({
                'id': str(uuid.uuid4()),
                'slug': slug,
                'name': p['name'],
                'description': p['description'],
                'price': p['price'],
                'oldPrice': p.get('oldPrice'),
                'discount': discount,
                'image': p['image'],
                'images': [p['image']],
                'category': p['category'],
                'unit': p.get('unit', '1 kg'),
                'stock': p.get('stock', 100),
                'organic': True,
                'featured': p.get('featured', False),
                'createdAt': datetime.utcnow().isoformat(),
            })
        logging.info('Seeded products')

    # Settings — default placeholder payment numbers (admin should update)
    if not await db.settings.find_one({'key': 'payment'}):
        await db.settings.insert_one({
            'key': 'payment',
            'bkashNumber': '01711-000000',
            'nagadNumber': '01711-000000',
            'bkashType': 'personal',
            'nagadType': 'personal',
            'instructions': 'অনুগ্রহ করে উপরের নম্বরে সঠিক পরিমাণ Send Money করুন এবং সফল হলে ট্রানজেকশন আইডি (TrxID) লিখুন। আমরা ১৫–৩০ মিনিটে যাচাই করে কনফার্ম করব।',
        })
        logging.info('Seeded payment settings')

    # Seed default site settings
    if not await db.settings.find_one({'key': 'site'}):
        await db.settings.insert_one({'key': 'site', **SITE_DEFAULTS})
        logging.info('Seeded site settings')

    # Seed default banners
    if await db.banners.count_documents({}) == 0:
        defaults = [
            {'id': str(uuid.uuid4()), 'title': 'Farm-fresh organic goodness', 'subtitle': 'Free delivery on orders over ৳500',
             'image': '', 'ctaLabel': 'Shop now', 'ctaLink': '/categories', 'active': True, 'order': 0,
             'createdAt': datetime.utcnow().isoformat()},
        ]
        await db.banners.insert_many(defaults)
        logging.info('Seeded banners')

    # Seed welcome coupon
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_one({
            'id': str(uuid.uuid4()), 'code': 'SOBUJ100', 'type': 'flat', 'value': 100,
            'minOrder': 500, 'maxDiscount': None, 'active': True, 'usageLimit': None,
            'expiresAt': None, 'usedCount': 0, 'createdAt': datetime.utcnow().isoformat(),
        })
        logging.info('Seeded welcome coupon SOBUJ100')


app.include_router(api)

# CORS — narrow to known origins in production via CORS_ORIGINS env (comma-separated).
_cors_env = os.environ.get('CORS_ORIGINS', '').strip()
_cors_origins = [o.strip() for o in _cors_env.split(',') if o.strip()] if _cors_env else ['*']
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event('shutdown')
async def shutdown_db_client(): client.close()
