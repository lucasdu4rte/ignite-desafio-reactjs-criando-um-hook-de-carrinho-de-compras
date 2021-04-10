import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviosValue = prevCartRef.current ?? cart

  useEffect(() => {
    if(cartPreviosValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviosValue])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      const existsInCart = newCart.find((product) => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = existsInCart ? existsInCart.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (existsInCart) {
        existsInCart.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        newCart.push(newProduct);
      }

      setCart(newCart);
    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find(product => product.id === productId);
      if (!productExist) {
        toast.error("Erro na remoção do produto");
        return;
      }
      const newCart = [...cart].filter((product) => product.id !== productId);
      setCart(newCart);
    } catch {
      toast.error("Erro ao tentar remover produto do carrinho");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }
      const productExist = cart.find(product => product.id === productId);
      if (!productExist) {
        toast.error("Erro na alteração de quantidade do produto");
        return
      }
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return
      }

      const newCart = [...cart].map((product) =>
        product.id === productId
          ? {
              ...product,
              amount,
            }
          : product
      );
      setCart(newCart);
    } catch {
      toast.error("Erro ao tentar alterar a quantidade produto do carrinho");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
