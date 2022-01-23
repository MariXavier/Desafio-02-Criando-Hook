import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    
    //Buscar dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    console.log("storagedCart", storagedCart);

    if (storagedCart) 
    {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try 
    {
      const cartAtualizar = [...cart];

      const produtoExistente = cartAtualizar.find(product => product.id === productId);
      const estoqueProduto = await api.get(`/stock/${productId}`);
      const quantidadeEmEstoque = estoqueProduto.data.amount;
      const quantidadeAtual = (produtoExistente ? produtoExistente.amount : 0);
      if((quantidadeAtual + 1) > quantidadeEmEstoque)
      {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //Se já existe o produto no cart, adicionamos 1 unidade
      if(produtoExistente)
      {
        produtoExistente.amount = produtoExistente.amount + 1;
        setCart(cartAtualizar);
       
        //atualizamos o storage
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAtualizar));
      }
      else
      {
        //obtemos o produto para criar um novo item no cart
        const produto = await api.get(`/products/${productId}`);
        const produtoNovo = 
        {
          ...produto.data, //copiamos todas as infos que ele já tinha
          amount:1
        }
        
        //guardamos o produto novo
        cartAtualizar.push(produtoNovo); 
        setCart(cartAtualizar);
       
        //atualizamos o storage
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAtualizar));
      }
    } catch 
    {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try 
    {
      const cartAtualizar = [...cart];
      const indexProdutoASerRemovido = cartAtualizar.findIndex(produto => produto.id === productId);
      
      if(indexProdutoASerRemovido>=0) //encontrou produto para remover
      {
        cartAtualizar.splice(indexProdutoASerRemovido, 1);
        setCart(cartAtualizar);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAtualizar));
      }
      else //não encontruo produto para remover
      {
        throw Error();
      }
    } 
    catch 
    {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try 
    {
      if(amount < 1)
      {
        return;
      }

      const cartAtualizar = [...cart];
      
      const indexProdutoParaAtualizar = cartAtualizar.findIndex(produto => produto.id === productId);
      if(indexProdutoParaAtualizar>=0)
      {
        const produtoAtualizar = cartAtualizar[indexProdutoParaAtualizar];

        const estoqueProduto = await api.get(`/stock/${productId}`);
        const quantidadeEmEstoque = estoqueProduto.data.amount;
        const quantidadeAtual = produtoAtualizar.amount;
        
        if((quantidadeAtual + amount) > quantidadeEmEstoque)
        {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if((quantidadeAtual + amount) < 1)
        {
          throw Error();
        }
        produtoAtualizar.amount = amount;
        setCart(cartAtualizar);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartAtualizar));
      }
      else
      {
        throw Error();
      }
    } catch 
    {
      toast.error('Erro na alteração de quantidade do produto');
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
